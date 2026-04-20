package com.kituirides.api.ride;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.RideOffer;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.DistanceSource;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.RideOfferStatus;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.matching.DriverMatchResult;
import com.kituirides.api.matching.MatchingService;
import com.kituirides.api.payment.PriceCalculationService;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.repository.RideOfferRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final RideOfferRepository rideOfferRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final VehicleRepository vehicleRepository;
    private final LocationPingRepository locationPingRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUserService;
    private final MatchingService matchingService;
    private final PriceCalculationService priceCalculationService;
    private final RealtimePublisher realtimePublisher;
    private final RideStateMachine rideStateMachine;
    private final RideRedisService rideRedisService;

    @Transactional
    public RideResponse createRide(CreateRideRequest request) {
        User customer = currentUserService.getCurrentUser();
        if (rideRepository.existsByCustomerAndStatusIn(customer, rideStateMachine.activeCustomerStatuses())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You already have an active ride");
        }

        List<DriverMatchResult> matches = matchingService.findEligibleDrivers(
            request.pickupLat(),
            request.pickupLng(),
            request.dropoffLat(),
            request.dropoffLng(),
            request.vehicleType()
        );
        if (matches.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "No nearby eligible drivers are available right now");
        }

        DriverMatchResult bestMatch = matches.get(0);
        BigDecimal estimatedDistanceKm = BigDecimal.valueOf(
            matchingService.haversineKm(
                request.pickupLat(),
                request.pickupLng(),
                request.dropoffLat(),
                request.dropoffLng()
            )
        ).setScale(2, RoundingMode.HALF_UP);

        Ride ride = new Ride();
        ride.setCustomer(customer);
        ride.setPickupLat(request.pickupLat());
        ride.setPickupLng(request.pickupLng());
        ride.setDropoffLat(request.dropoffLat());
        ride.setDropoffLng(request.dropoffLng());
        ride.setPickupAddress(request.pickupAddress());
        ride.setDropoffAddress(request.dropoffAddress());
        ride.setEstimatedFare(bestMatch.estimatedPrice());
        ride.setFinalFare(bestMatch.estimatedPrice());
        ride.setSurgeMultiplier(matchingService.calculateSurgeMultiplier());
        ride.setEtaMinutes(bestMatch.etaMinutes());
        ride.setStatus(RideStatus.REQUESTED);
        ride.setVehicleType(request.vehicleType());
        ride.setPaymentType(request.paymentType());
        ride.setEstimatedDistanceKm(estimatedDistanceKm);
        ride.setChargeableDistanceKm(null);
        ride.setDistanceSource(DistanceSource.ESTIMATED);
        ride.setPaymentApproved(false);
        ride.setManualDistanceRequired(false);

        Ride saved = rideRepository.save(ride);
        if (!rideRedisService.claimCustomerActiveRide(customer.getId(), saved.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "You already have an active ride");
        }

        createRideOffers(saved, matches);
        transitionStatus(saved, RideStatus.DRIVER_ASSIGNED);
        saved.setDriverAssignedAt(Instant.now());
        saved = rideRepository.save(saved);

        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_REQUESTED", toResponse(saved));
        publishPendingOffers(saved);
        return toResponse(saved);
    }

    @Transactional
    public RideResponse acceptRide(Long rideId) {
        User driver = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        expireStaleOffers(ride);

        RideOffer offer = rideOfferRepository.findByRideAndDriver(ride, driver)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ride offer not found"));
        if (offer.getStatus() != RideOfferStatus.PENDING || offer.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride offer is no longer available");
        }
        if (rideRepository.existsByRiderAndStatusIn(driver, rideStateMachine.activeDriverStatuses())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Driver already has an active ride");
        }
        if (!rideRedisService.acquireAcceptanceLock(rideId, driver.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Another driver is already accepting this ride");
        }

        boolean driverClaimed = false;
        try {
            if (!rideRedisService.claimDriverActiveRide(driver.getId(), ride.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "Driver already has an active ride");
            }
            driverClaimed = true;

            if (ride.getStatus() != RideStatus.DRIVER_ASSIGNED) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Ride is no longer awaiting driver acceptance");
            }

            offer.setStatus(RideOfferStatus.ACCEPTED);
            offer.setRespondedAt(Instant.now());
            rideOfferRepository.save(offer);

            rideOfferRepository.findByRideOrderByOfferedAtAsc(ride).stream()
                .filter(existing -> !existing.getId().equals(offer.getId()) && existing.getStatus() == RideOfferStatus.PENDING)
                .forEach(existing -> {
                    existing.setStatus(RideOfferStatus.EXPIRED);
                    existing.setRespondedAt(Instant.now());
                    rideOfferRepository.save(existing);
                });

            ride.setRider(driver);
            refreshPricingForAssignedDriver(ride);
            transitionStatus(ride, RideStatus.DRIVER_ACCEPTED);
            ride.setAcceptedAt(Instant.now());
            Ride saved = rideRepository.save(ride);

            realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_ACCEPTED", toResponse(saved));
            return toResponse(saved);
        } catch (RuntimeException ex) {
            if (driverClaimed) {
                rideRedisService.releaseDriverActiveRide(driver.getId(), ride.getId());
            }
            throw ex;
        } finally {
            rideRedisService.releaseAcceptanceLock(rideId);
        }
    }

    @Transactional
    public RideResponse rejectRide(Long rideId) {
        User driver = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        RideOffer offer = rideOfferRepository.findByRideAndDriver(ride, driver)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ride offer not found"));
        if (offer.getStatus() != RideOfferStatus.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride offer has already been handled");
        }

        offer.setStatus(RideOfferStatus.REJECTED);
        offer.setRespondedAt(Instant.now());
        rideOfferRepository.save(offer);

        if (rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(ride, RideOfferStatus.PENDING).isEmpty()) {
            transitionStatus(ride, RideStatus.DRIVER_REJECTED);
            rideRepository.save(ride);
        }

        realtimePublisher.publishRideUpdate(ride.getId(), "RIDE_REJECTED", toResponse(ride));
        return toResponse(ride);
    }

    @Transactional
    public RideResponse markArrival(Long rideId) {
        Ride ride = getRideForAssignedDriver(rideId);
        transitionStatus(ride, RideStatus.DRIVER_ARRIVED);
        ride.setArrivedAt(Instant.now());
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "DRIVER_ARRIVED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse startRide(Long rideId) {
        Ride ride = getRideForAssignedDriver(rideId);
        if (ride.getStatus() != RideStatus.DRIVER_ARRIVED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Driver must arrive before starting the trip");
        }
        transitionStatus(ride, RideStatus.TRIP_STARTED);
        Instant now = Instant.now();
        ride.setStartedAt(now);
        ride.setDriverStartedAt(now);
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "TRIP_STARTED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse completeRide(Long rideId) {
        Ride ride = getRideForAssignedDriver(rideId);
        if (ride.getStatus() != RideStatus.PAYMENT_COMPLETED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must reach PAYMENT_COMPLETED before completion");
        }
        if (!ride.getPaymentApproved()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment must be completed before trip completion");
        }

        transitionStatus(ride, RideStatus.TRIP_COMPLETED);
        ride.setCompletedAt(Instant.now());
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "TRIP_COMPLETED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse cancelRide(Long rideId) {
        User customer = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (!ride.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the customer can cancel this ride");
        }
        if (ride.getStatus() == RideStatus.TRIP_COMPLETED || ride.getStatus() == RideStatus.DRIVER_REJECTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride can no longer be cancelled");
        }

        Instant now = Instant.now();
        ride.setCancelledAt(now);
        ride.setCustomerCanceledAt(now);

        if (ride.getStatus() == RideStatus.REQUESTED
            || ride.getStatus() == RideStatus.DRIVER_ASSIGNED
            || ride.getStatus() == RideStatus.DRIVER_ACCEPTED
            || ride.getStatus() == RideStatus.DRIVER_ARRIVED) {
            ride.setChargeableDistanceKm(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            ride.setFinalFare(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            ride.setManualDistanceRequired(false);
        } else {
            prepareDistanceForSettlement(ride, null, false);
        }

        expirePendingOffers(ride);
        transitionStatus(ride, RideStatus.TRIP_CANCELLED);
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "TRIP_CANCELLED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse submitManualDistance(Long rideId, BigDecimal distanceKm) {
        Ride ride = getRideForAssignedDriver(rideId);
        if (ride.getStatus() != RideStatus.TRIP_STARTED
            && ride.getStatus() != RideStatus.TRIP_CANCELLED
            && ride.getStatus() != RideStatus.PAYMENT_PENDING
            && ride.getStatus() != RideStatus.DISPUTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Manual distance is not accepted in the current ride state");
        }

        applyChargeableDistance(ride, distanceKm, DistanceSource.MANUAL_DRIVER);
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "DISTANCE_UPDATED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse prepareForPayment(Long rideId, BigDecimal manualDistanceKm) {
        Ride ride = getRideById(rideId);
        if (ride.getStatus() != RideStatus.TRIP_STARTED
            && ride.getStatus() != RideStatus.PAYMENT_PENDING
            && ride.getStatus() != RideStatus.TRIP_CANCELLED
            && ride.getStatus() != RideStatus.DISPUTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride is not ready for payment");
        }

        prepareDistanceForSettlement(ride, manualDistanceKm, true);
        if (ride.getStatus() != RideStatus.TRIP_CANCELLED && ride.getStatus() != RideStatus.PAYMENT_PENDING) {
            transitionStatus(ride, RideStatus.PAYMENT_PENDING);
            ride.setPaymentPendingAt(Instant.now());
        } else if (ride.getStatus() == RideStatus.PAYMENT_PENDING && ride.getPaymentPendingAt() == null) {
            ride.setPaymentPendingAt(Instant.now());
        }

        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "PAYMENT_PENDING", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse markPaymentCompleted(Long rideId) {
        Ride ride = getRideById(rideId);
        ride.setPaymentApproved(true);
        ride.setPaymentCompletedAt(Instant.now());

        if (ride.getStatus() != RideStatus.TRIP_CANCELLED) {
            if (ride.getStatus() != RideStatus.PAYMENT_PENDING && ride.getStatus() != RideStatus.PAYMENT_COMPLETED) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Ride must be awaiting payment before completion");
            }
            if (ride.getStatus() != RideStatus.PAYMENT_COMPLETED) {
                transitionStatus(ride, RideStatus.PAYMENT_COMPLETED);
            }
        }

        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "PAYMENT_COMPLETED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse markDisputed(Long rideId, SupportTicket ticket, String reason) {
        Ride ride = getRideById(rideId);
        if (ride.getStatus() != RideStatus.DISPUTED) {
            transitionStatus(ride, RideStatus.DISPUTED);
        }
        ride.setDisputedAt(Instant.now());
        ride.setDisputeReason(reason);
        ride.setSupportTicket(ticket);
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "RIDE_DISPUTED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse resolveDispute(Long rideId, BigDecimal resolvedDistanceKm) {
        Ride ride = getRideById(rideId);
        if (ride.getStatus() != RideStatus.DISPUTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride is not in dispute");
        }

        if (resolvedDistanceKm != null) {
            applyChargeableDistance(ride, resolvedDistanceKm, DistanceSource.SUPPORT_OVERRIDE);
        }

        if (ride.getCancelledAt() != null) {
            transitionStatus(ride, RideStatus.TRIP_CANCELLED);
        } else if (ride.getPaymentApproved()) {
            transitionStatus(ride, RideStatus.PAYMENT_COMPLETED);
        } else {
            transitionStatus(ride, RideStatus.PAYMENT_PENDING);
            if (ride.getPaymentPendingAt() == null) {
                ride.setPaymentPendingAt(Instant.now());
            }
        }

        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "DISPUTE_RESOLVED", toResponse(saved));
        return toResponse(saved);
    }

    @Transactional
    public RideResponse supportOverrideDistance(Long rideId, BigDecimal newKms) {
        Ride ride = getRideById(rideId);
        applyChargeableDistance(ride, newKms, DistanceSource.SUPPORT_OVERRIDE);
        Ride saved = rideRepository.save(ride);
        realtimePublisher.publishRideUpdate(saved.getId(), "DISTANCE_OVERRIDDEN", toResponse(saved));
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

    public List<RideOfferResponse> myDriverOffers() {
        User currentUser = currentUserService.getCurrentUser();
        expireStaleOffersForDriver(currentUser);
        return rideOfferRepository.findByDriverAndStatusOrderByOfferedAtDesc(currentUser, RideOfferStatus.PENDING).stream()
            .filter(offer -> !offer.getExpiresAt().isBefore(Instant.now()))
            .sorted(Comparator.comparing(RideOffer::getOfferedAt).reversed())
            .map(this::toOfferResponse)
            .toList();
    }

    public RideResponse customerRideById(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (!ride.getCustomer().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ride does not belong to current customer");
        }
        return toResponse(ride);
    }

    public RideResponse driverRideById(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        boolean ownsRide = ride.getRider() != null && ride.getRider().getId().equals(currentUser.getId());
        boolean hasOffer = rideOfferRepository.findByRideAndDriver(ride, currentUser).isPresent();
        if (!ownsRide && !hasOffer) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ride is not available to the current driver");
        }
        return toResponse(ride);
    }

    public RideResponse rideById(Long rideId) {
        return toResponse(getRideById(rideId));
    }

    public List<RideResponse> listAll() {
        return rideRepository.findAll().stream()
            .sorted(Comparator.comparing(Ride::getRequestedAt).reversed())
            .map(this::toResponse)
            .toList();
    }

    public Ride getRideById(Long rideId) {
        return rideRepository.findById(rideId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ride not found"));
    }

    public RideResponse toResponse(Ride ride) {
        Payment payment = paymentRepository.findByRide(ride).orElse(null);
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
            ride.getPickupLat(),
            ride.getPickupLng(),
            ride.getDropoffLat(),
            ride.getDropoffLng(),
            ride.getEstimatedFare(),
            ride.getFinalFare(),
            ride.getSurgeMultiplier(),
            ride.getEtaMinutes(),
            ride.getStatus(),
            ride.getRequestedAt(),
            ride.getAcceptedAt(),
            ride.getArrivedAt(),
            ride.getStartedAt(),
            ride.getPaymentPendingAt(),
            ride.getPaymentCompletedAt(),
            ride.getCancelledAt(),
            ride.getDisputedAt(),
            ride.getCompletedAt(),
            ride.getVehicleType(),
            ride.getPaymentType(),
            payment != null ? payment.getStatus() : PaymentStatus.PENDING,
            ride.getEstimatedDistanceKm(),
            ride.getChargeableDistanceKm(),
            ride.getDistanceSource(),
            ride.getManualDistanceRequired(),
            ride.getPaymentApproved(),
            ride.getSupportTicket() != null ? ride.getSupportTicket().getId() : null,
            ride.getDisputeReason()
        );
    }

    private RideOfferResponse toOfferResponse(RideOffer offer) {
        Ride ride = offer.getRide();
        return new RideOfferResponse(
            offer.getId(),
            ride.getId(),
            offer.getStatus(),
            offer.getOfferedAt(),
            offer.getExpiresAt(),
            ride.getCustomer().getId(),
            ride.getCustomer().getFirstName() + " " + ride.getCustomer().getLastName(),
            ride.getCustomer().getPhoneNumber(),
            ride.getPickupAddress(),
            ride.getDropoffAddress(),
            ride.getVehicleType(),
            ride.getEstimatedFare(),
            ride.getEstimatedDistanceKm()
        );
    }

    private Ride getRideForAssignedDriver(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        Ride ride = getRideById(rideId);
        if (ride.getRider() == null || !ride.getRider().getId().equals(currentUser.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the assigned driver can act on this ride");
        }
        return ride;
    }

    private void createRideOffers(Ride ride, List<DriverMatchResult> matches) {
        List<RideOffer> offers = new ArrayList<>();
        for (DriverMatchResult match : matches) {
            RideOffer offer = new RideOffer();
            offer.setRide(ride);
            offer.setDriver(match.driver());
            offers.add(offer);
        }
        rideOfferRepository.saveAll(offers);
    }

    private void publishPendingOffers(Ride ride) {
        rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(ride, RideOfferStatus.PENDING)
            .forEach(offer -> realtimePublisher.publishDriverOffer(offer.getDriver().getId(), toOfferResponse(offer)));
    }

    private void transitionStatus(Ride ride, RideStatus nextStatus) {
        rideStateMachine.assertTransition(ride.getStatus(), nextStatus);
        ride.setStatus(nextStatus);
        if (rideStateMachine.isTerminal(nextStatus)) {
            releaseActiveLocks(ride);
        }
    }

    private void releaseActiveLocks(Ride ride) {
        rideRedisService.releaseCustomerActiveRide(ride.getCustomer().getId(), ride.getId());
        if (ride.getRider() != null) {
            rideRedisService.releaseDriverActiveRide(ride.getRider().getId(), ride.getId());
        }
    }

    private void refreshPricingForAssignedDriver(Ride ride) {
        Vehicle vehicle = getVehicleForDriver(ride.getRider());
        BigDecimal targetDistance = ride.getChargeableDistanceKm() != null
            ? ride.getChargeableDistanceKm()
            : ride.getEstimatedDistanceKm();
        BigDecimal recalculatedFare = priceCalculationService.calculatePrice(
            targetDistance,
            ride.getVehicleType(),
            vehicle.getEngineSize(),
            ride.getSurgeMultiplier()
        );
        ride.setEstimatedFare(recalculatedFare);
        ride.setFinalFare(recalculatedFare);
        ride.setEtaMinutes(Math.max(ride.getEtaMinutes(), 2));
    }

    private void prepareDistanceForSettlement(Ride ride, BigDecimal manualDistanceKm, boolean failWhenManualIsRequired) {
        if (manualDistanceKm != null) {
            applyChargeableDistance(ride, manualDistanceKm, DistanceSource.MANUAL_DRIVER);
            return;
        }
        if (ride.getChargeableDistanceKm() != null && !ride.getManualDistanceRequired()) {
            return;
        }

        List<LocationPing> tripPings = ride.getRider() == null || ride.getStartedAt() == null
            ? List.of()
            : locationPingRepository.findByUserAndTimestampBetweenOrderByTimestampAsc(
                ride.getRider(),
                ride.getStartedAt(),
                Instant.now()
            );

        if (tripPings.size() < 2) {
            ride.setManualDistanceRequired(true);
            if (failWhenManualIsRequired) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Manual KM entry is required before payment can proceed");
            }
            return;
        }

        BigDecimal gpsDistance = calculateDistanceFromPings(tripPings);
        applyChargeableDistance(ride, gpsDistance, DistanceSource.GPS);
    }

    private BigDecimal calculateDistanceFromPings(List<LocationPing> pings) {
        double totalKm = 0.0;
        for (int i = 1; i < pings.size(); i++) {
            LocationPing previous = pings.get(i - 1);
            LocationPing current = pings.get(i);
            totalKm += matchingService.haversineKm(
                previous.getLatitude(),
                previous.getLongitude(),
                current.getLatitude(),
                current.getLongitude()
            );
        }
        return BigDecimal.valueOf(totalKm).setScale(2, RoundingMode.HALF_UP);
    }

    private void applyChargeableDistance(Ride ride, BigDecimal distanceKm, DistanceSource distanceSource) {
        if (distanceKm == null || distanceKm.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Distance must be zero or greater");
        }
        Vehicle vehicle = ride.getRider() != null ? getVehicleForDriver(ride.getRider()) : null;
        BigDecimal normalizedDistance = distanceKm.setScale(2, RoundingMode.HALF_UP);
        ride.setChargeableDistanceKm(normalizedDistance);
        ride.setDistanceSource(distanceSource);
        ride.setManualDistanceRequired(false);
        if (vehicle != null) {
            ride.setFinalFare(priceCalculationService.calculatePrice(
                normalizedDistance,
                ride.getVehicleType(),
                vehicle.getEngineSize(),
                ride.getSurgeMultiplier()
            ));
        } else {
            ride.setFinalFare(ride.getEstimatedFare());
        }
    }

    private Vehicle getVehicleForDriver(User driver) {
        var profile = riderProfileRepository.findByUserId(driver.getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Driver profile not found"));
        return vehicleRepository.findByRiderProfile(profile)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver vehicle is missing"));
    }

    private void expireStaleOffersForDriver(User driver) {
        rideOfferRepository.findByDriverAndStatusOrderByOfferedAtDesc(driver, RideOfferStatus.PENDING).stream()
            .filter(offer -> offer.getExpiresAt().isBefore(Instant.now()))
            .forEach(offer -> expireOffer(offer));
    }

    private void expireStaleOffers(Ride ride) {
        rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(ride, RideOfferStatus.PENDING).stream()
            .filter(offer -> offer.getExpiresAt().isBefore(Instant.now()))
            .forEach(this::expireOffer);
    }

    private void expirePendingOffers(Ride ride) {
        rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(ride, RideOfferStatus.PENDING)
            .forEach(this::expireOffer);
    }

    private void expireOffer(RideOffer offer) {
        if (offer.getStatus() != RideOfferStatus.PENDING) {
            return;
        }
        offer.setStatus(RideOfferStatus.EXPIRED);
        offer.setRespondedAt(Instant.now());
        rideOfferRepository.save(offer);
    }
}
