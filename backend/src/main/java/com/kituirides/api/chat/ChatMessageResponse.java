package com.kituirides.api.chat;

import java.time.Instant;

public record ChatMessageResponse(
    Long id,
    String content,
    Boolean systemMessage,
    Boolean readByCurrentUser,
    Instant createdAt,
    ChatParticipantResponse sender
) {
}
