package com.kituirides.api.websocket;

public record DriverLocationMessage(
    Long riderId,
    Double latitude,
    Double longitude
) {
}
