package com.kituirides.api.support;

import jakarta.validation.constraints.NotBlank;

public record CreateTicketRequest(
    @NotBlank String subject,
    @NotBlank String description
) {
}
