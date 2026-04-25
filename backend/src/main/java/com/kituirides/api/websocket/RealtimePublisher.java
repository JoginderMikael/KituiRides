package com.kituirides.api.websocket;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Publishes realtime ride and driver updates over messaging channels.
 */
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishRideUpdate(Long rideId, String type, Object payload) {
        Map<String, Object> event = Map.of(
            "type", type,
            "payload", payload
        );
        messagingTemplate.convertAndSend("/topic/rides/" + rideId, event);
        messagingTemplate.convertAndSend("/topic/rides", event);
    }

    public void publishNearbyDrivers(Object payload) {
        messagingTemplate.convertAndSend("/topic/drivers/nearby", payload);
    }

    public void publishDriverOffer(Long driverId, Object payload) {
        messagingTemplate.convertAndSend("/topic/drivers/" + driverId + "/offers", payload);
    }

    public void publishConversationUpdate(Long conversationId, String type, Object payload) {
        Map<String, Object> event = Map.of(
            "type", type,
            "payload", payload
        );
        messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, event);
    }

    public void publishChatInboxUpdate(Long userId, Object payload) {
        messagingTemplate.convertAndSend("/topic/chat/users/" + userId, payload);
    }
}
