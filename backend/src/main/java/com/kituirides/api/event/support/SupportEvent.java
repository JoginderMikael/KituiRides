package com.kituirides.api.event.support;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.kituirides.api.domain.enums.TicketStatus;
import com.kituirides.api.domain.enums.TicketType;
import com.kituirides.api.event.BaseEvent;
import com.kituirides.api.event.EventType;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class SupportEvent extends BaseEvent {
    private Long ticketId;
    private Long createdByUserId;
    private Long assignedToUserId;
    private TicketType ticketType;
    private TicketStatus status;
    private String subject;

    public SupportEvent() {
    }

    public SupportEvent(
        EventType eventType,
        Long ticketId,
        Long rideId,
        Long createdByUserId,
        Long assignedToUserId,
        TicketType ticketType,
        TicketStatus status,
        String subject
    ) {
        super(eventType, createdByUserId, rideId, ticketId != null ? "ticket-" + ticketId : null);
        this.ticketId = ticketId;
        this.createdByUserId = createdByUserId;
        this.assignedToUserId = assignedToUserId;
        this.ticketType = ticketType;
        this.status = status;
        this.subject = subject;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public Long getAssignedToUserId() {
        return assignedToUserId;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public String getSubject() {
        return subject;
    }
}
