package com.kituirides.api.event.notification;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.kituirides.api.event.BaseEvent;
import com.kituirides.api.event.EventType;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class NotificationEvent extends BaseEvent {
    private Long recipientUserId;
    private String title;
    private String message;
    private NotificationChannel channel;
    private Long relatedRideId;

    public NotificationEvent() {
    }

    public NotificationEvent(
        EventType eventType,
        Long recipientUserId,
        String title,
        String message,
        NotificationChannel channel,
        Long relatedRideId
    ) {
        super(eventType, recipientUserId, relatedRideId, relatedRideId != null ? "ride-" + relatedRideId : null);
        this.recipientUserId = recipientUserId;
        this.title = title;
        this.message = message;
        this.channel = channel;
        this.relatedRideId = relatedRideId;
    }

    public Long getRecipientUserId() {
        return recipientUserId;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public NotificationChannel getChannel() {
        return channel;
    }

    public Long getRelatedRideId() {
        return relatedRideId;
    }
}
