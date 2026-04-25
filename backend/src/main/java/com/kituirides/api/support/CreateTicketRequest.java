package com.kituirides.api.support;

import com.kituirides.api.domain.enums.TicketType;
import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for create ticket.
 */
public record CreateTicketRequest(
    @NotBlank String subject,
    @NotBlank String description,
    TicketType ticketType,
    Long rideId
) {
}
