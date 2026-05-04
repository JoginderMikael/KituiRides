package com.kituirides.api.kafka.producer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.notification.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class NotificationEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsProperties topics;

    public void publish(NotificationEvent event) {
        kafkaTemplate.send(topics.notificationEvents(), String.valueOf(event.getRecipientUserId()), event);
        log.info("Event published: topic={}, eventId={}, eventType={}", topics.notificationEvents(), event.getEventId(), event.getEventType());
    }
}
