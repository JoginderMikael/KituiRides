package com.kituirides.api.ride;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.VehicleType;
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
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RideServiceCompletionTest {

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

    @Test
    void shouldAllowDriverToCompleteRideWhenPaymentIsSuccessfulButRideIsStillPending() {
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
            rideRedisService
        );

        User customer = new User();
        customer.setId(1L);
        customer.setRole(Role.CUSTOMER);

        User driver = new User();
        driver.setId(2L);
        driver.setRole(Role.DRIVER);

        Ride ride = new Ride();
        ride.setId(44L);
        ride.setCustomer(customer);
        ride.setRider(driver);
        ride.setPickupAddress("Kitui CBD");
        ride.setDropoffAddress("Kalundu");
        ride.setPickupLat(-1.3771);
        ride.setPickupLng(38.0106);
        ride.setDropoffLat(-1.3656);
        ride.setDropoffLng(38.0118);
        ride.setEstimatedFare(new BigDecimal("500.00"));
        ride.setFinalFare(new BigDecimal("500.00"));
        ride.setStatus(RideStatus.PAYMENT_PENDING);
        ride.setVehicleType(VehicleType.CAR);
        ride.setPaymentType(PaymentType.MPESA);
        ride.setEtaMinutes(5);
        ride.setPaymentApproved(false);

        Payment payment = new Payment();
        payment.setRide(ride);
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setCompletedAt(Instant.parse("2026-04-24T12:00:00Z"));

        when(currentUserService.getCurrentUser()).thenReturn(driver);
        when(rideRepository.findById(44L)).thenReturn(Optional.of(ride));
        when(paymentRepository.findByRide(ride)).thenReturn(Optional.of(payment));
        when(rideRepository.save(any(Ride.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RideResponse response = service.completeRide(44L);

        assertEquals(RideStatus.TRIP_COMPLETED, response.status());
        assertEquals(true, response.paymentApproved());
        assertEquals(Instant.parse("2026-04-24T12:00:00Z"), response.paymentCompletedAt());
        verify(chatService).closeRideChatThread(ride, "This ride chat was closed because the trip was completed.");
    }
}
