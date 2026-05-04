package com.kituirides.api.kafka;

import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.event.EventType;
import com.kituirides.api.event.analytics.AnalyticsEvent;
import com.kituirides.api.event.notification.NotificationChannel;
import com.kituirides.api.event.notification.NotificationEvent;
import com.kituirides.api.event.payment.PaymentEvent;
import com.kituirides.api.event.ride.RideEvent;
import com.kituirides.api.event.support.SupportEvent;
import com.kituirides.api.kafka.producer.AnalyticsEventProducer;
import com.kituirides.api.kafka.producer.NotificationEventProducer;
import com.kituirides.api.kafka.producer.PaymentEventProducer;
import com.kituirides.api.kafka.producer.RideEventProducer;
import com.kituirides.api.kafka.producer.SupportEventProducer;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class KafkaDomainEventPublisher implements DomainEventPublisher {

    private final RideEventProducer rideEventProducer;
    private final PaymentEventProducer paymentEventProducer;
    private final NotificationEventProducer notificationEventProducer;
    private final SupportEventProducer supportEventProducer;
    private final AnalyticsEventProducer analyticsEventProducer;

    @Override
    public void publishRideEvent(EventType eventType, Ride ride) {
        if (ride == null || ride.getId() == null) {
            return;
        }
        RideEvent event = new RideEvent(
            eventType,
            ride.getId(),
            ride.getCustomer() != null ? ride.getCustomer().getId() : null,
            ride.getRider() != null ? ride.getRider().getId() : null,
            ride.getPickupLat(),
            ride.getPickupLng(),
            ride.getDropoffLat(),
            ride.getDropoffLng(),
            ride.getVehicleType(),
            ride.getFinalFare(),
            ride.getStatus()
        );
        rideEventProducer.publish(event);
        publishRideSideEffects(eventType, ride);
    }

    @Override
    public void publishPaymentEvent(EventType eventType, Payment payment) {
        if (payment == null || payment.getId() == null) {
            return;
        }
        PaymentEvent event = new PaymentEvent(
            eventType,
            payment.getId(),
            payment.getRide() != null ? payment.getRide().getId() : null,
            payment.getRide() != null && payment.getRide().getCustomer() != null ? payment.getRide().getCustomer().getId() : null,
            payment.getAmount(),
            payment.getPaymentType(),
            payment.getStatus(),
            payment.getProviderReceiptNumber()
        );
        paymentEventProducer.publish(event);
        if (eventType == EventType.PAYMENT_SUCCESSFUL || eventType == EventType.PAYMENT_COMPLETED) {
            notificationEventProducer.publish(new NotificationEvent(
                EventType.PAYMENT_RECEIVED,
                event.getCustomerId(),
                "Payment received",
                "Your ride payment was received successfully.",
                NotificationChannel.IN_APP,
                event.getRideId()
            ));
            analyticsEventProducer.publish(new AnalyticsEvent(
                EventType.PAYMENT_SUCCESSFUL,
                event.getCustomerId(),
                event.getRideId(),
                "payment_successful",
                payment.getAmount(),
                Map.of("method", String.valueOf(payment.getPaymentType()))
            ));
        }
    }

    @Override
    public void publishDriverLocationUpdated(Long driverId, Double latitude, Double longitude, Long rideId) {
        analyticsEventProducer.publish(new AnalyticsEvent(
            EventType.DRIVER_LOCATION_UPDATED,
            driverId,
            rideId,
            "driver_location_updated",
            null,
            Map.of("latitude", latitude, "longitude", longitude)
        ));
    }

    @Override
    public void publishDriverStatusChanged(Long driverId, boolean online) {
        analyticsEventProducer.publish(new AnalyticsEvent(
            online ? EventType.DRIVER_ONLINE : EventType.DRIVER_OFFLINE,
            driverId,
            null,
            online ? "driver_online" : "driver_offline",
            null,
            Map.of("driverId", driverId, "online", online)
        ));
    }

    @Override
    public void publishSupportEvent(EventType eventType, SupportTicket ticket) {
        if (ticket == null || ticket.getId() == null) {
            return;
        }
        supportEventProducer.publish(new SupportEvent(
            eventType,
            ticket.getId(),
            ticket.getRideId(),
            ticket.getCreatedBy() != null ? ticket.getCreatedBy().getId() : null,
            ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
            ticket.getTicketType(),
            ticket.getStatus(),
            ticket.getSubject()
        ));
        Long recipientId = ticket.getCreatedBy() != null ? ticket.getCreatedBy().getId() : null;
        if (eventType == EventType.SUPPORT_REPLY || eventType == EventType.TICKET_UPDATED || eventType == EventType.TICKET_CLOSED) {
            notificationEventProducer.publish(new NotificationEvent(
                eventType == EventType.SUPPORT_REPLY ? EventType.SUPPORT_REPLY : EventType.TICKET_UPDATED,
                recipientId,
                "Support update",
                "Your support ticket has an update.",
                NotificationChannel.IN_APP,
                ticket.getRideId()
            ));
        }
    }

    private void publishRideSideEffects(EventType eventType, Ride ride) {
        if (eventType == EventType.DRIVER_MATCHED && ride.getRider() != null) {
            notificationEventProducer.publish(new NotificationEvent(
                EventType.DRIVER_FOUND,
                ride.getCustomer().getId(),
                "Driver found",
                "A driver has been matched to your ride.",
                NotificationChannel.IN_APP,
                ride.getId()
            ));
        }
        if (eventType == EventType.DRIVER_ACCEPTED) {
            notificationEventProducer.publish(new NotificationEvent(
                EventType.RIDE_ACCEPTED,
                ride.getCustomer().getId(),
                "Ride accepted",
                "Your driver accepted the ride.",
                NotificationChannel.IN_APP,
                ride.getId()
            ));
        }
        if (eventType == EventType.RIDE_CANCELLED) {
            notificationEventProducer.publish(new NotificationEvent(
                EventType.RIDE_CANCELLED,
                ride.getCustomer().getId(),
                "Ride cancelled",
                "Your ride was cancelled.",
                NotificationChannel.IN_APP,
                ride.getId()
            ));
        }
        if (eventType == EventType.RIDE_COMPLETED) {
            analyticsEventProducer.publish(new AnalyticsEvent(
                EventType.RIDE_COMPLETED,
                ride.getCustomer().getId(),
                ride.getId(),
                "ride_completed",
                ride.getFinalFare(),
                Map.of("vehicleType", String.valueOf(ride.getVehicleType()))
            ));
        }
    }
}
