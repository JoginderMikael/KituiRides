package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.Role;
import java.time.Instant;

public record ChatMessageResponse(
    Long id,
    String content,
    Boolean isRead,
    Instant createdAt,
    Long senderId,
    String senderName,
    String senderPhone,
    Role senderRole
) {
}
