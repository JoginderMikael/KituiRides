package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.ConversationStatus;
import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.domain.enums.TicketStatus;
import com.kituirides.api.domain.enums.TicketType;
import java.time.Instant;

/**
 * Response payload for chat thread.
 */
public record ChatThreadResponse(
    Long id,
    Long ticketId,
    Long rideId,
    String subject,
    String description,
    ConversationType threadType,
    ConversationStatus status,
    TicketType ticketType,
    TicketStatus ticketStatus,
    String resolutionNotes,
    String lastMessagePreview,
    Long unreadCount,
    Instant createdAt,
    Instant updatedAt,
    Instant lastMessageAt,
    Instant closedAt,
    Instant autoClosedAt,
    ChatParticipantResponse participant,
    ChatThreadPermissionsResponse permissions
) {
}
