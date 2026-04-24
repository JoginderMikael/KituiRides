package com.kituirides.api.matching;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.payment.PriceCalculationService;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.ride.RideStateMachine;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final double MATCH_RADIUS_KM = 5.0;
    private static final int MAX_MATCHES = 10;
    private static final Duration LOCATION_FRESHNESS = Duration.ofMinutes(2);
    private static final double ESTIMATED_DISTANCE_EXTRA_PERCENT = 25.0;

    private final RiderProfileRepository riderProfileRepository;
    private final LocationPingRepository locationPingRepository;
    private final VehicleRepository vehicleRepository;
    private final RideRepository rideRepository;
    private final RideStateMachine rideStateMachine;
    private final PriceCalculationService priceCalculationService;

    public List<DriverMatchResult> findEligibleDrivers(
        double pickupLat,
        double pickupLng,
        double dropoffLat,
        double dropoffLng,
        VehicleType vehicleType
    ) {
        Instant freshnessCutoff = Instant.now().minus(LOCATION_FRESHNESS);
        double estimatedDistance = estimateTripDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
        double surgeMultiplier = calculateSurgeMultiplier();

        return riderProfileRepository.findByVerifiedTrueAndAvailableTrue().stream()
            .map(profile -> {
                Vehicle vehicle = vehicleRepository.findByRiderProfile(profile).orElse(null);
                if (vehicle == null || vehicle.getVehicleType() != vehicleType) {
                    return null;
                }
                if (rideRepository.existsByRiderAndStatusIn(profile.getUser(), rideStateMachine.activeDriverStatuses())) {
                    return null;
                }

                Optional<LocationPing> latestPing = locationPingRepository.findTopByUserOrderByTimestampDesc(profile.getUser());
                if (latestPing.isEmpty() || latestPing.get().getTimestamp().isBefore(freshnessCutoff)) {
                    return null;
                }

                double distanceToPickupKm = haversineKm(
                    pickupLat,
                    pickupLng,
                    latestPing.get().getLatitude(),
                    latestPing.get().getLongitude()
                );
                if (distanceToPickupKm > MATCH_RADIUS_KM) {
                    return null;
                }

                BigDecimal estimatedPrice = priceCalculationService.calculatePrice(
                    BigDecimal.valueOf(estimatedDistance),
                    vehicleType,
                    vehicle.getEngineSize(),
                    surgeMultiplier
                );

                int eta = Math.max(2, (int) Math.round(distanceToPickupKm / 0.4));
                return new DriverMatchResult(
                    profile.getUser(),
                    vehicle,
                    latestPing.get().getLatitude(),
                    latestPing.get().getLongitude(),
                    eta,
                    distanceToPickupKm,
                    estimatedPrice
                );
            })
            .filter(result -> result != null)
            .sorted(Comparator.comparingDouble(DriverMatchResult::distanceToPickupKm))
            .limit(MAX_MATCHES)
            .toList();
    }

    public double calculateSurgeMultiplier() {
        long demand = rideRepository.countByStatusIn(rideStateMachine.activeCustomerStatuses());
        long supply = riderProfileRepository.findByVerifiedTrueAndAvailableTrue().size();
        if (supply <= 0) {
            return 1.0;
        }
        double ratio = demand == 0 ? 1.0 : (double) demand / supply;
        return BigDecimal.valueOf(Math.max(1.0, Math.min(1.5, ratio)))
            .setScale(2, RoundingMode.HALF_UP)
            .doubleValue();
    }

    public double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final int earthRadiusKm = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.pow(Math.sin(dLat / 2), 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.pow(Math.sin(dLon / 2), 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    public double estimateTripDistanceKm(double pickupLat, double pickupLng, double dropoffLat, double dropoffLng) {
        double directDistanceKm = haversineKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
        return directDistanceKm + (directDistanceKm * ESTIMATED_DISTANCE_EXTRA_PERCENT / 100);
    }
}
