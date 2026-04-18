package com.kituirides.api.location;

public record NearbyDriverResponse(
    Long riderId,
    Double latitude,
    Double longitude
) {
}
