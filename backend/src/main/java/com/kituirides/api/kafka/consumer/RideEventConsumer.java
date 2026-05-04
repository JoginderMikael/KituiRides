package com.kituirides.api.kafka.consumer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.notification.NotificationChannel;
import com.kituirides.api.event.notification.NotificationEvent;
import com.kituirides.api.event.ride.RideEvent;
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
public class RideEventConsumer {

    private final KafkaTopicsProperties topics;
    private final EventIdempotencyService idempotencyService;
    private final NotificationEventProducer notificationEventProducer;

    @KafkaListener(topics = "${app.kafka.topics.ride-events}")
    public void consume(RideEvent event) {
        if (!idempotencyService.markProcessingStarted(event, topics.rideEvents())) {
            return;
        }
        log.info("Event consumed: topic={}, eventId={}, eventType={}, rideId={}", topics.rideEvents(), event.getEventId(), event.getEventType(), event.getRideId());
        if (event.getEventType() == EventType.DRIVER_MATCHED) {
            notificationEventProducer.publish(new NotificationEvent(
                EventType.DRIVER_FOUND,
                event.getCustomerId(),
                "Driver found",
                "A driver has been matched to your ride.",
                NotificationChannel.IN_APP,
                event.getRideId()
            ));
        }
    }
}
