package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.ConversationType;
import java.time.Instant;

public record ChatConversationResponse(
    Long id,
    Long rideId,
    ConversationType conversationType,
    Long participantUserId,
    String participantName,
    String participantPhone,
    Long supportAgentUserId,
    String supportAgentName,
    String supportAgentPhone,
    Long unreadCount,
    Instant updatedAt
) {
}
