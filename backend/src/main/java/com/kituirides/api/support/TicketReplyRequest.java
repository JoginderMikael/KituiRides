package com.kituirides.api.support;

import jakarta.validation.constraints.NotBlank;

public record TicketReplyRequest(@NotBlank String message) {
}
