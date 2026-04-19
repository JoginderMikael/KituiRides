package com.kituirides.api.location;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationPingRepository locationPingRepository;
    private final CurrentUserService currentUserService;
    private final RiderProfileRepository riderProfileRepository;
    private final VehicleRepository vehicleRepository;
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

    public List<NearbyDriverResponse> nearbyDrivers() {
        var nearby = riderProfileRepository.findByVerifiedTrueAndAvailableTrue().stream()
            .map(profile -> {
                var user = profile.getUser();
                var vehicle = vehicleRepository.findByRiderProfile(profile).orElse(null);
                return locationPingRepository.findTopByUserOrderByTimestampDesc(user)
                    .map(ping -> new NearbyDriverResponse(
                        user.getId(), 
                        ping.getLatitude(), 
                        ping.getLongitude(),
                        vehicle != null ? vehicle.getMake() + " " + vehicle.getModel() : "Unknown",
                        vehicle != null ? vehicle.getPlateNumber() : "Unknown",
                        user.getFirstName() + " " + user.getLastName()
                    ));
            })
            .flatMap(Optional::stream)
            .toList();
        realtimePublisher.publishNearbyDrivers(nearby);
        return nearby;
    }
}
