package com.kituirides.api.support;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for ticket reply.
 */
public record TicketReplyRequest(@NotBlank String message) {
}
