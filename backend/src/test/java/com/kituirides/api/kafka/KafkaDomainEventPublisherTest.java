package com.kituirides.api.kafka;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.analytics.AnalyticsEvent;
import com.kituirides.api.event.ride.RideEvent;
import com.kituirides.api.kafka.producer.AnalyticsEventProducer;
import com.kituirides.api.kafka.producer.NotificationEventProducer;
import com.kituirides.api.kafka.producer.PaymentEventProducer;
import com.kituirides.api.kafka.producer.RideEventProducer;
import com.kituirides.api.kafka.producer.SupportEventProducer;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class KafkaDomainEventPublisherTest {

    @Mock private RideEventProducer rideEventProducer;
    @Mock private PaymentEventProducer paymentEventProducer;
    @Mock private NotificationEventProducer notificationEventProducer;
    @Mock private SupportEventProducer supportEventProducer;
    @Mock private AnalyticsEventProducer analyticsEventProducer;

    @Test
    void shouldPublishAnalyticsWhenRideCompletes() {
        KafkaDomainEventPublisher publisher = new KafkaDomainEventPublisher(
            rideEventProducer,
            paymentEventProducer,
            notificationEventProducer,
            supportEventProducer,
            analyticsEventProducer
        );

        User customer = new User();
        customer.setId(1L);
        Ride ride = new Ride();
        ride.setId(55L);
        ride.setCustomer(customer);
        ride.setVehicleType(VehicleType.CAR);
        ride.setFinalFare(new BigDecimal("470.00"));
        ride.setStatus(RideStatus.TRIP_COMPLETED);

        publisher.publishRideEvent(EventType.RIDE_COMPLETED, ride);

        verify(rideEventProducer).publish(any(RideEvent.class));
        verify(analyticsEventProducer).publish(any(AnalyticsEvent.class));
    }
}
