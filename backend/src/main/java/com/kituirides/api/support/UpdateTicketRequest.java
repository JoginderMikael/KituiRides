package com.kituirides.api.support;

import com.kituirides.api.domain.enums.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateTicketRequest(
    @NotNull TicketStatus status,
    String resolutionNotes
) {
}
