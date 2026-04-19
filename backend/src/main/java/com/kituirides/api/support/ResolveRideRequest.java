package com.kituirides.api.support;

import java.math.BigDecimal;

public record ResolveRideRequest(
    BigDecimal resolvedDistanceKm,
    String resolutionNotes
) {
}
