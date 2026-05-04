package com.kituirides.api.kafka;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.notification.NotificationEvent;
import com.kituirides.api.event.ride.RideEvent;
import com.kituirides.api.kafka.consumer.RideEventConsumer;
import com.kituirides.api.kafka.producer.NotificationEventProducer;
import com.kituirides.api.service.EventIdempotencyService;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RideEventConsumerTest {

    @Mock private EventIdempotencyService idempotencyService;
    @Mock private NotificationEventProducer notificationEventProducer;

    @Test
    void shouldSkipDuplicateRideEvent() {
        KafkaTopicsProperties topics = topics();
        RideEventConsumer consumer = new RideEventConsumer(topics, idempotencyService, notificationEventProducer);
        RideEvent event = rideEvent(EventType.DRIVER_MATCHED);
        when(idempotencyService.markProcessingStarted(event, topics.rideEvents())).thenReturn(false);

        consumer.consume(event);

        verify(notificationEventProducer, never()).publish(org.mockito.ArgumentMatchers.any(NotificationEvent.class));
    }

    @Test
    void shouldPublishDriverFoundNotificationWhenDriverMatched() {
        KafkaTopicsProperties topics = topics();
        RideEventConsumer consumer = new RideEventConsumer(topics, idempotencyService, notificationEventProducer);
        RideEvent event = rideEvent(EventType.DRIVER_MATCHED);
        when(idempotencyService.markProcessingStarted(event, topics.rideEvents())).thenReturn(true);

        consumer.consume(event);

        verify(notificationEventProducer).publish(org.mockito.ArgumentMatchers.any(NotificationEvent.class));
    }

    private RideEvent rideEvent(EventType eventType) {
        return new RideEvent(
            eventType,
            55L,
            1L,
            2L,
            -1.3771,
            38.0106,
            -1.3656,
            38.0118,
            VehicleType.CAR,
            new BigDecimal("470.00"),
            RideStatus.DRIVER_ASSIGNED
        );
    }

    private KafkaTopicsProperties topics() {
        return new KafkaTopicsProperties(
            "kituirides.ride-events",
            "kituirides.payment-events",
            "kituirides.driver-location-events",
            "kituirides.notification-events",
            "kituirides.support-events",
            "kituirides.analytics-events"
        );
    }
}
