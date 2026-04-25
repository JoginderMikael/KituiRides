package com.kituirides.api.support;

import com.kituirides.api.domain.enums.TicketStatus;
import com.kituirides.api.domain.enums.TicketType;
import java.time.Instant;
import java.util.List;

/**
 * Response payload for ticket.
 */
public record TicketResponse(
    Long id,
    Long createdByUserId,
    Long assignedToUserId,
    String subject,
    String description,
    TicketType ticketType,
    Long rideId,
    TicketStatus status,
    String resolutionNotes,
    Instant createdAt,
    List<TicketReplyResponse> replies
) {
}
