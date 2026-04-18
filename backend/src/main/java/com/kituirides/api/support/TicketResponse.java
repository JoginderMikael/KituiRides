package com.kituirides.api.support;

import com.kituirides.api.domain.enums.TicketStatus;
import java.time.Instant;

public record TicketResponse(
    Long id,
    Long createdByUserId,
    Long assignedToUserId,
    String subject,
    String description,
    TicketStatus status,
    Instant createdAt
) {
}
