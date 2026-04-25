package com.kituirides.api.support;

import java.time.Instant;

/**
 * Response payload for ticket reply.
 */
public record TicketReplyResponse(
    Long id,
    Long authorUserId,
    String message,
    Instant createdAt
) {
}
