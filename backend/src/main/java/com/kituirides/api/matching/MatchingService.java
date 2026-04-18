package com.kituirides.api.matching;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import java.util.Comparator;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private final RiderProfileRepository riderProfileRepository;
    private final LocationPingRepository locationPingRepository;

    public Optional<DriverMatchResult> findNearestAvailableRider(double pickupLat, double pickupLng) {
        return riderProfileRepository.findByVerifiedTrueAndAvailableTrue().stream()
            .map(profile -> {
                Optional<LocationPing> ping = locationPingRepository.findTopByUserOrderByTimestampDesc(profile.getUser());
                if (ping.isEmpty()) {
                    return null;
                }
                double distanceKm = haversineKm(pickupLat, pickupLng, ping.get().getLatitude(), ping.get().getLongitude());
                int eta = Math.max(2, (int) Math.round(distanceKm / 0.4));
                return new DriverMatchResult(profile.getUser(), eta, distanceKm);
            })
            .filter(result -> result != null)
            .min(Comparator.comparingDouble(DriverMatchResult::distanceKm));
    }

    public double calculateSurgeMultiplier() {
        long demand = riderProfileRepository.count() * 2L;
        long supply = riderProfileRepository.findByVerifiedTrueAndAvailableTrue().size();
        if (supply == 0) {
            return 1.8;
        }
        double ratio = (double) demand / supply;
        return Math.min(2.0, Math.max(1.0, ratio / 2.0));
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
