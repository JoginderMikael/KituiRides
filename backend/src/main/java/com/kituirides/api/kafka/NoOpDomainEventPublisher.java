package com.kituirides.api.kafka;

import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.event.EventType;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnMissingBean(DomainEventPublisher.class)
public class NoOpDomainEventPublisher implements DomainEventPublisher {
    @Override
    public void publishRideEvent(EventType eventType, Ride ride) {
    }

    @Override
    public void publishPaymentEvent(EventType eventType, Payment payment) {
    }

    @Override
    public void publishDriverLocationUpdated(Long driverId, Double latitude, Double longitude, Long rideId) {
    }

    @Override
    public void publishDriverStatusChanged(Long driverId, boolean online) {
    }

    @Override
    public void publishSupportEvent(EventType eventType, SupportTicket ticket) {
    }
}
