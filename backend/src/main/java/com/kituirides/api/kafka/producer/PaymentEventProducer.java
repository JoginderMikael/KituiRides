package com.kituirides.api.kafka.producer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.payment.PaymentEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class PaymentEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsProperties topics;

    public void publish(PaymentEvent event) {
        kafkaTemplate.send(topics.paymentEvents(), String.valueOf(event.getPaymentId()), event);
        log.info("Event published: topic={}, eventId={}, eventType={}", topics.paymentEvents(), event.getEventId(), event.getEventType());
    }
}
