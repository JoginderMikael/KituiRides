package com.kituirides.api.ride;

import java.math.BigDecimal;

/**
 * Response payload for ride estimate.
 */
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
