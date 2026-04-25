package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.domain.enums.TicketType;
import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for create chat thread.
 */
public record CreateChatThreadRequest(
    ConversationType threadType,
    Long participantUserId,
    Long rideId,
    TicketType ticketType,
    @NotBlank String subject,
    @NotBlank String description
) {
}
