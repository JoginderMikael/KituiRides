package com.kituirides.api.location;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Route geometry returned without exposing the server-side Maps API key.
 */
public record DirectionsRouteResponse(
    @Schema(description = "Google encoded polyline. Null when no route is available.")
    String encodedPolyline
) {
}
