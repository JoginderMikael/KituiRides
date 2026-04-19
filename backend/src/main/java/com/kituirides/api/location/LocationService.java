package com.kituirides.api.location;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.matching.MatchingService;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final com.kituirides.api.repository.LocationPingRepository locationPingRepository;
    private final CurrentUserService currentUserService;
    private final MatchingService matchingService;
    private final RealtimePublisher realtimePublisher;

    @Transactional
    public void updateMyLocation(LocationUpdateRequest request) {
        var user = currentUserService.getCurrentUser();
        LocationPing ping = new LocationPing();
        ping.setUser(user);
        ping.setLatitude(request.latitude());
        ping.setLongitude(request.longitude());
        ping.setTimestamp(Instant.now());
        locationPingRepository.save(ping);
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
                match.vehicle().getMake() + " " + match.vehicle().getModel(),
                match.vehicle().getPlateNumber(),
                match.driver().getFirstName() + " " + match.driver().getLastName(),
                match.vehicle().getVehicleType(),
                match.etaMinutes(),
                BigDecimal.valueOf(match.distanceToPickupKm()).setScale(2, RoundingMode.HALF_UP),
                match.estimatedPrice()
            ))
            .toList();
        realtimePublisher.publishNearbyDrivers(nearby);
        return nearby;
    }
}
