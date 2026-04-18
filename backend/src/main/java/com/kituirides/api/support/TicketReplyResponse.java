package com.kituirides.api.support;

import java.time.Instant;

public record TicketReplyResponse(
    Long id,
    Long authorUserId,
    String message,
    Instant createdAt
) {
}
