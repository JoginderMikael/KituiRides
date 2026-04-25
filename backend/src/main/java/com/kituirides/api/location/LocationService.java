package com.kituirides.api.location;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.matching.MatchingService;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.ride.RideStateMachine;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles location workflows.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final com.kituirides.api.repository.LocationPingRepository locationPingRepository;
    private final CurrentUserService currentUserService;
    private final MatchingService matchingService;
    private final RealtimePublisher realtimePublisher;
    private final RideRepository rideRepository;
    private final RideStateMachine rideStateMachine;

    @Transactional
    public void updateMyLocation(LocationUpdateRequest request) {
        var user = currentUserService.getCurrentUser();
        log.info("Driver {} updating location to lat={}, lng={}", user.getId(), request.latitude(), request.longitude());
        LocationPing ping = new LocationPing();
        ping.setUser(user);
        ping.setLatitude(request.latitude());
        ping.setLongitude(request.longitude());
        ping.setTimestamp(Instant.now());
        locationPingRepository.save(ping);
        realtimePublisher.publishNearbyDrivers(Map.of(
            "type", "DRIVER_LOCATION_UPDATED",
            "riderId", user.getId(),
            "latitude", request.latitude(),
            "longitude", request.longitude()
        ));
        rideRepository.findByRiderAndStatusIn(user, rideStateMachine.activeDriverStatuses())
            .forEach(ride -> realtimePublisher.publishRideUpdate(
                ride.getId(),
                "DRIVER_LOCATION_UPDATED",
                Map.of(
                    "rideId", ride.getId(),
                    "riderId", user.getId(),
                    "latitude", request.latitude(),
                    "longitude", request.longitude()
                )
            ));
    }

    public List<NearbyDriverResponse> nearbyDrivers(
        double pickupLat,
        double pickupLng,
        double dropoffLat,
        double dropoffLng,
        VehicleType vehicleType
    ) {
        var nearby = matchingService.findEligibleDrivers(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType).stream()
            .map(match -> new NearbyDriverResponse(
                match.driver().getId(),
                match.latitude(),
                match.longitude(),
                match.vehicleModel(),
                match.plateNumber(),
                match.driverName(),
                match.vehicleType(),
                match.etaMinutes(),
                BigDecimal.valueOf(match.distanceToPickupKm()).setScale(2, RoundingMode.HALF_UP),
                match.estimatedPrice()
            ))
            .toList();
        log.info(
            "Nearby drivers response: pickup=({}, {}), vehicleType={}, count={}",
            pickupLat,
            pickupLng,
            vehicleType,
            nearby.size()
        );
        try {
            realtimePublisher.publishNearbyDrivers(nearby);
        } catch (RuntimeException exception) {
            log.warn("Failed to publish nearby drivers update", exception);
        }
        return nearby;
    }
}
