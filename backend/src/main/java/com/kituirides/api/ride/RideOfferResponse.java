package com.kituirides.api.ride;

import com.kituirides.api.domain.enums.RideOfferStatus;
import com.kituirides.api.domain.enums.VehicleType;
import java.math.BigDecimal;
import java.time.Instant;

public record RideOfferResponse(
    Long id,
    Long rideId,
    RideOfferStatus status,
    Instant offeredAt,
    Instant expiresAt,
    Long customerId,
    String customerName,
    String customerPhone,
    String pickupAddress,
    String dropoffAddress,
    VehicleType vehicleType,
    BigDecimal estimatedFare,
    BigDecimal estimatedDistanceKm
) {
}
