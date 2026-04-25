package com.kituirides.api.websocket;

/**
 * Message payload for driver location.
 */
public record DriverLocationMessage(
    Long riderId,
    Double latitude,
    Double longitude
) {
}
