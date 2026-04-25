package com.kituirides.api.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

/**
 * Handles inbound WebSocket messages related to ride updates.
 */
@Controller
@RequiredArgsConstructor
public class RideSocketController {

    private final RealtimePublisher realtimePublisher;

    @MessageMapping("/driver/location")
    public void onDriverLocation(DriverLocationMessage message) {
        realtimePublisher.publishNearbyDrivers(message);
    }
}
