package com.kituirides.api.support;

import com.kituirides.api.domain.enums.TicketType;
import jakarta.validation.constraints.NotBlank;

public record CreateTicketRequest(
    @NotBlank String subject,
    @NotBlank String description,
    TicketType ticketType,
    Long rideId
) {
}
