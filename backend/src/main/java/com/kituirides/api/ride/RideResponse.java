package com.kituirides.api.ride;

import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import java.math.BigDecimal;
import java.time.Instant;

public record RideResponse(
    Long id,
    Long customerId,
    String customerName,
    String customerPhone,
    Long riderId,
    String riderName,
    String riderPhone,
    String pickupAddress,
    String dropoffAddress,
    BigDecimal estimatedFare,
    BigDecimal finalFare,
    Double surgeMultiplier,
    Integer etaMinutes,
    RideStatus status,
    Instant requestedAt,
    Instant acceptedAt,
    Instant startedAt,
    Instant completedAt,
    VehicleType vehicleType,
    BigDecimal distanceKm,
    Boolean paymentApproved
) {
}
