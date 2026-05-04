package com.kituirides.api.kafka.consumer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.notification.NotificationChannel;
import com.kituirides.api.event.notification.NotificationEvent;
import com.kituirides.api.event.support.SupportEvent;
import com.kituirides.api.kafka.producer.NotificationEventProducer;
import com.kituirides.api.service.EventIdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class SupportEventConsumer {

    private final KafkaTopicsProperties topics;
    private final EventIdempotencyService idempotencyService;
    private final NotificationEventProducer notificationEventProducer;

    @KafkaListener(topics = "${app.kafka.topics.support-events}")
    public void consume(SupportEvent event) {
        if (!idempotencyService.markProcessingStarted(event, topics.supportEvents())) {
            return;
        }
        log.info("Event consumed: topic={}, eventId={}, eventType={}, ticketId={}", topics.supportEvents(), event.getEventId(), event.getEventType(), event.getTicketId());
        if (event.getEventType() == EventType.SUPPORT_REPLY || event.getEventType() == EventType.TICKET_UPDATED) {
            notificationEventProducer.publish(new NotificationEvent(
                event.getEventType(),
                event.getCreatedByUserId(),
                "Support update",
                "Your support ticket has an update.",
                NotificationChannel.IN_APP,
                event.getRideId()
            ));
        }
    }
}
