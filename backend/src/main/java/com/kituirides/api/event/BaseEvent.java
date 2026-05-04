package com.kituirides.api.event;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import java.time.Instant;
import java.util.UUID;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public abstract class BaseEvent {
    private UUID eventId;
    private EventType eventType;
    private Instant occurredAt;
    private String source;
    private String correlationId;
    private Long userId;
    private Long rideId;

    protected BaseEvent() {
    }

    protected BaseEvent(EventType eventType, Long userId, Long rideId, String correlationId) {
        this.eventId = UUID.randomUUID();
        this.eventType = eventType;
        this.occurredAt = Instant.now();
        this.source = "kituirides-api";
        this.correlationId = correlationId;
        this.userId = userId;
        this.rideId = rideId;
    }

    public UUID getEventId() {
        return eventId;
    }

    public EventType getEventType() {
        return eventType;
    }

    public Instant getOccurredAt() {
        return occurredAt;
    }

    public String getSource() {
        return source;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getRideId() {
        return rideId;
    }
}
