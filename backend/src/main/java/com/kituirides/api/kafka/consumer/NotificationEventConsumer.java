package com.kituirides.api.kafka.consumer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.notification.NotificationEvent;
import com.kituirides.api.service.EventIdempotencyService;
import com.kituirides.api.service.NotificationDispatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class NotificationEventConsumer {

    private final KafkaTopicsProperties topics;
    private final EventIdempotencyService idempotencyService;
    private final NotificationDispatchService notificationDispatchService;

    @KafkaListener(topics = "${app.kafka.topics.notification-events}")
    public void consume(NotificationEvent event) {
        if (!idempotencyService.markProcessingStarted(event, topics.notificationEvents())) {
            return;
        }
        log.info("Event consumed: topic={}, eventId={}, eventType={}, recipient={}", topics.notificationEvents(), event.getEventId(), event.getEventType(), event.getRecipientUserId());
        notificationDispatchService.dispatch(event);
    }
}
