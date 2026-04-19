package com.kituirides.api.ride;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.matching.MatchingService;
import com.kituirides.api.payment.PriceCalculationService;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final VehicleRepository vehicleRepository;
    private final CurrentUserService currentUserService;
    private final MatchingService matchingService;
    private final PriceCalculationService priceCalculationService;
    private final com.kituirides.api.support.ChatService chatService;
    private final RealtimePublisher realtimePublisher;

    @Transactional
    public RideResponse createRide(CreateRideRequest request) {
        User customer = currentUserService.getCurrentUser();
        
        // Check for active rides
        List<RideStatus> activeStatuses = List.of(RideStatus.REQUESTED, RideStatus.MATCHED, RideStatus.ACCEPTED, RideStatus.STARTED);
        if (!rideRepository.findByCustomerAndStatusIn(customer, activeStatuses).isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You already have an active ride");
        }

        User rider = userRepository.findById(request.riderId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Driver not found"));
        
        var profile = riderProfileRepository.findByUserId(rider.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Driver profile not found"));
        
        var vehicle = vehicleRepository.findByRiderProfile(profile)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver has no vehicle registered"));

        double distanceKm = haversineKm(request.pickupLat(), request.pickupLng(), request.dropoffLat(), request.dropoffLng());
        double surgeMultiplier = matchingService.calculateSurgeMultiplier();
        
        BigDecimal estimatedFare = priceCalculationService.calculatePrice(
            BigDecimal.valueOf(distanceKm), 
            request.vehicleType(), 
            vehicle.getEngineSize(), 
            surgeMultiplier
        );

        Ride ride = new Ride();
        ride.setCustomer(customer);
        ride.setRider(rider);
        ride.setPickupLat(request.pickupLat());
        ride.setPickupLng(request.pickupLng());
        ride.setDropoffLat(request.dropoffLat());
        ride.setDropoffLng(request.dropoffLng());
        ride.setPickupAddress(request.pickupAddress());
        ride.setDropoffAddress(request.dropoffAddress());
        ride.setEstimatedFare(estimatedFare);
        ride.setFinalFare(estimatedFare);
        ride.setSurgeMultiplier(surgeMultiplier);
        ride.setEtaMinutes(10);
        ride.setStatus(RideStatus.REQUESTED);
        ride.setVehicleType(request.vehicleType());
        ride.setDistanceKm(BigDecimal.valueOf(distanceKm));

        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_REQUESTED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse acceptRide(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (ride.getStatus() != RideStatus.MATCHED && ride.getStatus() != RideStatus.REQUESTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride cannot be accepted in current state");
        }
        if (ride.getRider() != null && !ride.getRider().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ride assigned to a different rider");
        }
        ride.setRider(currentUser);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAcceptedAt(Instant.now());
        Ride saved = rideRepository.save(ride);
        
        // Create conversation
        chatService.getOrCreateRideConversation(saved);
        
        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_ACCEPTED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse startRide(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (ride.getRider() == null || !ride.getRider().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only assigned rider can start this ride");
        }
        if (ride.getStatus() != RideStatus.ACCEPTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must be accepted before start");
        }
        ride.setStatus(RideStatus.STARTED);
        ride.setStartedAt(Instant.now());
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_STARTED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse completeRide(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (ride.getRider() == null || !ride.getRider().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only assigned rider can complete this ride");
        }
        if (ride.getStatus() != RideStatus.STARTED && ride.getStatus() != RideStatus.ACCEPTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must be accepted before completion");
        }
        
        // Requirement: driver may click trip complete only and only when driver approves payment
        if (!ride.getPaymentApproved()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment must be approved before completing the trip");
        }

        if (ride.getStartedAt() == null) {
            ride.setStartedAt(Instant.now());
        }
        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(Instant.now());
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_COMPLETED", toResponse(saved));
        return toResponse(saved);
    }

    public List<RideResponse> myCustomerRides() {
        User currentUser = currentUserService.getCurrentUser();
        return rideRepository.findByCustomerOrderByRequestedAtDesc(currentUser).stream().map(this::toResponse).toList();
    }

    public List<RideResponse> myDriverRides() {
        User currentUser = currentUserService.getCurrentUser();
        return rideRepository.findByRiderOrderByRequestedAtDesc(currentUser).stream().map(this::toResponse).toList();
    }

    public RideResponse customerRideById(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (!ride.getCustomer().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ride does not belong to current customer");
        }
        return toResponse(ride);
    }

    public List<RideResponse> listAll() {
        return rideRepository.findAll().stream().map(this::toResponse).toList();
    }

    public Ride getRideById(Long rideId) {
        return rideRepository.findById(rideId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ride not found"));
    }

    @Transactional
    public RideResponse cancelRide(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        
        if (!ride.getCustomer().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the customer can cancel this ride");
        }
        
        if (ride.getStatus() == RideStatus.COMPLETED || ride.getStatus() == RideStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride is already " + ride.getStatus());
        }
        
        if (ride.getStatus() == RideStatus.STARTED) {
            // Charge for distance traveled (simplified: charge 70% if already started, 
            // or we could try to calculate actual distance if we had current driver location)
            // For now, let's keep the finalFare as is if it started, or calculate based on partial distance if possible.
            // The requirement says "charged by the number of KMs traveled by the time of cancelation".
            // Since we don't have real-time KM, let's mark it as cancelled but keep it for payment.
            ride.setCustomerCanceledAt(Instant.now());
        }
        
        ride.setStatus(RideStatus.CANCELLED);
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_CANCELLED", toResponse(saved));
        return toResponse(saved);
    }

    public RideResponse toResponse(Ride ride) {
        return new RideResponse(
            ride.getId(),
            ride.getCustomer().getId(),
            ride.getCustomer().getFirstName() + " " + ride.getCustomer().getLastName(),
            ride.getCustomer().getPhoneNumber(),
            ride.getRider() != null ? ride.getRider().getId() : null,
            ride.getRider() != null ? ride.getRider().getFirstName() + " " + ride.getRider().getLastName() : null,
            ride.getRider() != null ? ride.getRider().getPhoneNumber() : null,
            ride.getPickupAddress(),
            ride.getDropoffAddress(),
            ride.getEstimatedFare(),
            ride.getFinalFare(),
            ride.getSurgeMultiplier(),
            ride.getEtaMinutes(),
            ride.getStatus(),
            ride.getRequestedAt(),
            ride.getAcceptedAt(),
            ride.getStartedAt(),
            ride.getCompletedAt(),
            ride.getVehicleType(),
            ride.getDistanceKm(),
            ride.getPaymentApproved()
        );
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final int earthRadiusKm = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.pow(Math.sin(dLon / 2), 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }
}
