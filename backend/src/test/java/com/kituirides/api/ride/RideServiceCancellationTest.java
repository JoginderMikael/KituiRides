package com.kituirides.api.ride;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.RideOfferStatus;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.VehicleType;
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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RideServiceCancellationTest {

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
    void shouldCancelPreTripRideWithoutCharge() {
        RideStateMachine stateMachine = new RideStateMachine();
        RideService service = new RideService(
            rideRepository,
            rideOfferRepository,
            riderProfileRepository,
            vehicleRepository,
            locationPingRepository,
            paymentRepository,
            currentUserService,
            matchingService,
            priceCalculationService,
            chatService,
            realtimePublisher,
            stateMachine,
            rideRedisService,
            domainEventPublisher
        );

        User customer = new User();
        customer.setId(1L);
        customer.setFirstName("Jane");
        customer.setLastName("Customer");
        customer.setPhoneNumber("254700000001");
        customer.setRole(Role.CUSTOMER);

        Ride ride = new Ride();
        ride.setId(22L);
        ride.setCustomer(customer);
        ride.setPickupAddress("Kitui CBD");
        ride.setDropoffAddress("Kalundu");
        ride.setPickupLat(-1.3771);
        ride.setPickupLng(38.0106);
        ride.setDropoffLat(-1.3656);
        ride.setDropoffLng(38.0118);
        ride.setEstimatedFare(new BigDecimal("500.00"));
        ride.setFinalFare(new BigDecimal("500.00"));
        ride.setStatus(RideStatus.REQUESTED);
        ride.setVehicleType(VehicleType.CAR);
        ride.setPaymentType(PaymentType.CASH);
        ride.setEtaMinutes(5);

        when(currentUserService.getCurrentUser()).thenReturn(customer);
        when(rideRepository.findById(22L)).thenReturn(Optional.of(ride));
        when(rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(ride, RideOfferStatus.PENDING)).thenReturn(List.of());
        when(rideRepository.save(any(Ride.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RideResponse response = service.cancelRide(22L);

        assertEquals(RideStatus.TRIP_CANCELLED, response.status());
        assertEquals(new BigDecimal("0.00"), response.finalFare());
        assertEquals(new BigDecimal("0.00"), response.chargeableDistanceKm());
        assertFalse(response.manualDistanceRequired());
        verify(chatService).closeRideChatThread(ride, "This ride chat was closed because the trip was cancelled.");
        verify(rideRedisService).releaseCustomerActiveRide(1L, 22L);
    }
}
