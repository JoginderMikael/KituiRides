package com.kituirides.api.chat;

import java.time.Instant;

/**
 * Response payload for chat message.
 */
public record ChatMessageResponse(
    Long id,
    String content,
    Boolean systemMessage,
    Boolean readByCurrentUser,
    Instant createdAt,
    ChatParticipantResponse sender
) {
}
