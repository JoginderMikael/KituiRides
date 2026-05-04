package com.kituirides.api.kafka;

import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.event.EventType;

public interface DomainEventPublisher {
    void publishRideEvent(EventType eventType, Ride ride);

    void publishPaymentEvent(EventType eventType, Payment payment);

    void publishDriverLocationUpdated(Long driverId, Double latitude, Double longitude, Long rideId);

    void publishDriverStatusChanged(Long driverId, boolean online);

    void publishSupportEvent(EventType eventType, SupportTicket ticket);
}
