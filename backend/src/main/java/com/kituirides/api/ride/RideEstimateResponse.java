package com.kituirides.api.ride;

import java.math.BigDecimal;

public record RideEstimateResponse(
    BigDecimal directDistanceKm,
    BigDecimal distanceBufferPercent,
    BigDecimal distanceBufferKm,
    BigDecimal estimatedDistanceKm,
    BigDecimal estimatedFare,
    Double surgeMultiplier,
    String pricingBasis
) {
}
