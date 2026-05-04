package com.kituirides.api.kafka;

import static org.mockito.Mockito.verify;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.ride.RideEvent;
import com.kituirides.api.kafka.producer.RideEventProducer;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

@ExtendWith(MockitoExtension.class)
class RideEventProducerTest {

    @Mock private KafkaTemplate<String, Object> kafkaTemplate;

    @Test
    void shouldPublishRideEventToRideTopic() {
        KafkaTopicsProperties topics = new KafkaTopicsProperties(
            "kituirides.ride-events",
            "kituirides.payment-events",
            "kituirides.driver-location-events",
            "kituirides.notification-events",
            "kituirides.support-events",
            "kituirides.analytics-events"
        );
        RideEventProducer producer = new RideEventProducer(kafkaTemplate, topics);
        RideEvent event = new RideEvent(
            EventType.RIDE_REQUESTED,
            55L,
            1L,
            null,
            -1.3771,
            38.0106,
            -1.3656,
            38.0118,
            VehicleType.CAR,
            new BigDecimal("470.00"),
            RideStatus.REQUESTED
        );

        producer.publish(event);

        verify(kafkaTemplate).send("kituirides.ride-events", "55", event);
    }
}
