package com.kituirides.api.ride;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.matching.MatchingService;
import com.kituirides.api.repository.RideRepository;
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
    private final CurrentUserService currentUserService;
    private final MatchingService matchingService;
    private final RealtimePublisher realtimePublisher;

    @Transactional
    public RideResponse createRide(CreateRideRequest request) {
        User customer = currentUserService.getCurrentUser();
        double distanceKm = haversineKm(request.pickupLat(), request.pickupLng(), request.dropoffLat(), request.dropoffLng());
        double surgeMultiplier = matchingService.calculateSurgeMultiplier();
        BigDecimal estimated = BigDecimal.valueOf(150 + (distanceKm * 65)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal finalFare = estimated.multiply(BigDecimal.valueOf(surgeMultiplier)).setScale(2, RoundingMode.HALF_UP);

        Ride ride = new Ride();
        ride.setCustomer(customer);
        ride.setPickupLat(request.pickupLat());
        ride.setPickupLng(request.pickupLng());
        ride.setDropoffLat(request.dropoffLat());
        ride.setDropoffLng(request.dropoffLng());
        ride.setPickupAddress(request.pickupAddress());
        ride.setDropoffAddress(request.dropoffAddress());
        ride.setEstimatedFare(estimated);
        ride.setFinalFare(finalFare);
        ride.setSurgeMultiplier(surgeMultiplier);
        ride.setEtaMinutes(10);
        ride.setStatus(RideStatus.REQUESTED);

        var match = matchingService.findNearestAvailableRider(request.pickupLat(), request.pickupLng());
        if (match.isPresent()) {
            ride.setRider(match.get().rider());
            ride.setEtaMinutes(match.get().etaMinutes());
            ride.setStatus(RideStatus.MATCHED);
        }

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

    public RideResponse toResponse(Ride ride) {
        return new RideResponse(
            ride.getId(),
            ride.getCustomer().getId(),
            ride.getRider() != null ? ride.getRider().getId() : null,
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
            ride.getCompletedAt()
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
