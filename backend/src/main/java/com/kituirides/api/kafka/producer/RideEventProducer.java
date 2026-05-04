package com.kituirides.api.kafka.producer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.ride.RideEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class RideEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicsProperties topics;

    public void publish(RideEvent event) {
        kafkaTemplate.send(topics.rideEvents(), String.valueOf(event.getRideId()), event);
        log.info("Event published: topic={}, eventId={}, eventType={}", topics.rideEvents(), event.getEventId(), event.getEventType());
    }
}
