package com.kituirides.api.ride;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.RideOffer;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.RideOfferStatus;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.event.EventType;
import com.kituirides.api.kafka.DomainEventPublisher;
import com.kituirides.api.matching.MatchingService;
import com.kituirides.api.payment.PriceCalculationService;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.repository.RideOfferRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.support.ChatService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RideServiceOfferExpiryTest {
    @Mock private RideRepository rideRepository;
    @Mock private RideOfferRepository rideOfferRepository;
    @Mock private RiderProfileRepository riderProfileRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private LocationPingRepository locationPingRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private CurrentUserService currentUserService;
    @Mock private MatchingService matchingService;
    @Mock private PriceCalculationService priceCalculationService;
    @Mock private ChatService chatService;
    @Mock private RealtimePublisher realtimePublisher;
    @Mock private RideRedisService rideRedisService;
    @Mock private DomainEventPublisher domainEventPublisher;

    @Test
    void shouldCloseRideAndReleaseCustomerWhenLastOfferExpires() {
        RideService service = new RideService(
            rideRepository, rideOfferRepository, riderProfileRepository, vehicleRepository,
            locationPingRepository, paymentRepository, currentUserService, matchingService,
            priceCalculationService, chatService, realtimePublisher, new RideStateMachine(),
            rideRedisService, domainEventPublisher
        );

        User customer = new User();
        customer.setId(1L);
        customer.setFirstName("Jane");
        customer.setLastName("Customer");
        customer.setPhoneNumber("254700000001");

        Ride ride = new Ride();
        ride.setId(55L);
        ride.setCustomer(customer);
        ride.setPickupAddress("Kitui CBD");
        ride.setDropoffAddress("Kalundu");
        ride.setPickupLat(-1.3771);
        ride.setPickupLng(38.0106);
        ride.setDropoffLat(-1.3656);
        ride.setDropoffLng(38.0118);
        ride.setEstimatedFare(new BigDecimal("500.00"));
        ride.setFinalFare(new BigDecimal("500.00"));
        ride.setStatus(RideStatus.DRIVER_ASSIGNED);
        ride.setVehicleType(VehicleType.CAR);
        ride.setPaymentType(PaymentType.CASH);
        ride.setEtaMinutes(5);

        RideOffer offer = new RideOffer();
        offer.setId(77L);
        offer.setRide(ride);
        offer.setStatus(RideOfferStatus.PENDING);
        offer.setExpiresAt(Instant.now().minusSeconds(1));

        when(rideOfferRepository.findByStatusAndExpiresAtBefore(eq(RideOfferStatus.PENDING), any(Instant.class)))
            .thenReturn(List.of(offer));
        when(rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(ride, RideOfferStatus.PENDING))
            .thenReturn(List.of());
        when(rideRepository.save(ride)).thenReturn(ride);
        when(paymentRepository.findByRide(ride)).thenReturn(Optional.empty());

        service.expireUnansweredRideOffers();

        assertEquals(RideOfferStatus.EXPIRED, offer.getStatus());
        assertEquals(RideStatus.DRIVER_REJECTED, ride.getStatus());
        verify(rideRedisService).releaseCustomerActiveRide(1L, 55L);
        verify(realtimePublisher).publishRideUpdate(eq(55L), eq("NO_DRIVER_AVAILABLE"), any(RideResponse.class));
        verify(domainEventPublisher).publishRideEvent(EventType.DRIVER_REJECTED, ride);
    }
}
