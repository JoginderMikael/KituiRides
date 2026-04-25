package com.kituirides.api.support;

import java.math.BigDecimal;

/**
 * Request payload for resolve ride.
 */
public record ResolveRideRequest(
    BigDecimal resolvedDistanceKm,
    String resolutionNotes
) {
}
