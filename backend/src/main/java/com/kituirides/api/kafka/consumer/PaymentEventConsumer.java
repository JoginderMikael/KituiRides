package com.kituirides.api.kafka.consumer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.notification.NotificationChannel;
import com.kituirides.api.event.notification.NotificationEvent;
import com.kituirides.api.event.payment.PaymentEvent;
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
public class PaymentEventConsumer {

    private final KafkaTopicsProperties topics;
    private final EventIdempotencyService idempotencyService;
    private final NotificationEventProducer notificationEventProducer;

    @KafkaListener(topics = "${app.kafka.topics.payment-events}")
    public void consume(PaymentEvent event) {
        if (!idempotencyService.markProcessingStarted(event, topics.paymentEvents())) {
            return;
        }
        log.info("Event consumed: topic={}, eventId={}, eventType={}, paymentId={}", topics.paymentEvents(), event.getEventId(), event.getEventType(), event.getPaymentId());
        if (event.getEventType() == EventType.PAYMENT_SUCCESSFUL) {
            notificationEventProducer.publish(new NotificationEvent(
                EventType.PAYMENT_RECEIVED,
                event.getCustomerId(),
                "Payment received",
                "Your ride payment was received successfully.",
                NotificationChannel.IN_APP,
                event.getRideId()
            ));
        }
    }
}
