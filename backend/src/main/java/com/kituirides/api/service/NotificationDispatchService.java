package com.kituirides.api.service;

import com.kituirides.api.event.notification.NotificationEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class NotificationDispatchService {

    public void dispatch(NotificationEvent event) {
        log.info(
            "Notification prepared: eventId={}, recipientUserId={}, channel={}, title={}",
            event.getEventId(),
            event.getRecipientUserId(),
            event.getChannel(),
            event.getTitle()
        );
    }
}
