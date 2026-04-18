package com.kituirides.api.ride;

import com.kituirides.api.domain.enums.RideStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record RideResponse(
    Long id,
    Long customerId,
    Long riderId,
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
    Instant completedAt
) {
}
