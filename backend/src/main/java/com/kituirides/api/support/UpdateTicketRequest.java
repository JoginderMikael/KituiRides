package com.kituirides.api.support;

import com.kituirides.api.domain.enums.TicketStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for update ticket.
 */
public record UpdateTicketRequest(
    @NotNull TicketStatus status,
    String resolutionNotes
) {
}
