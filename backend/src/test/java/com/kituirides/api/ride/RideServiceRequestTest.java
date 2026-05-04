package com.kituirides.api.ride;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.RideOffer;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.event.EventType;
import com.kituirides.api.kafka.DomainEventPublisher;
import com.kituirides.api.matching.DriverMatchResult;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RideServiceRequestTest {

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
    void shouldCreateRideForSelectedDriverOnly() {
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

        User firstDriver = new User();
        firstDriver.setId(10L);
        firstDriver.setFirstName("Alpha");
        firstDriver.setLastName("Driver");
        firstDriver.setPhoneNumber("254700000010");
        firstDriver.setRole(Role.DRIVER);

        User secondDriver = new User();
        secondDriver.setId(11L);
        secondDriver.setFirstName("Beta");
        secondDriver.setLastName("Driver");
        secondDriver.setPhoneNumber("254700000011");
        secondDriver.setRole(Role.DRIVER);

        Vehicle firstVehicle = new Vehicle();
        firstVehicle.setMake("Toyota");
        firstVehicle.setModel("Axio");
        firstVehicle.setPlateNumber("KDL 111A");
        firstVehicle.setVehicleType(VehicleType.CAR);
        firstVehicle.setEngineSize(1500);

        Vehicle secondVehicle = new Vehicle();
        secondVehicle.setMake("Nissan");
        secondVehicle.setModel("Note");
        secondVehicle.setPlateNumber("KDL 222B");
        secondVehicle.setVehicleType(VehicleType.CAR);
        secondVehicle.setEngineSize(1800);

        DriverMatchResult firstMatch = new DriverMatchResult(
            firstDriver,
            firstVehicle,
            -1.371200,
            38.019600,
            "Alpha Driver",
            "Toyota Axio",
            "KDL 111A",
            VehicleType.CAR,
            4,
            1.2,
            new BigDecimal("420.00")
        );
        DriverMatchResult secondMatch = new DriverMatchResult(
            secondDriver,
            secondVehicle,
            -1.371000,
            38.019900,
            "Beta Driver",
            "Nissan Note",
            "KDL 222B",
            VehicleType.CAR,
            5,
            1.4,
            new BigDecimal("470.00")
        );

        CreateRideRequest request = new CreateRideRequest(
            -1.3771,
            38.0106,
            -1.3656,
            38.0118,
            "Kitui CBD",
            "Kalundu",
            VehicleType.CAR,
            PaymentType.MPESA,
            11L
        );

        List<RideOffer> savedOffers = new ArrayList<>();

        when(currentUserService.getCurrentUser()).thenReturn(customer);
        when(rideRepository.existsByCustomerAndStatusIn(eq(customer), any())).thenReturn(false);
        when(matchingService.findEligibleDrivers(-1.3771, 38.0106, -1.3656, 38.0118, VehicleType.CAR))
            .thenReturn(List.of(firstMatch, secondMatch));
        when(matchingService.estimateTripDistanceKm(-1.3771, 38.0106, -1.3656, 38.0118)).thenReturn(4.20);
        when(matchingService.calculateSurgeMultiplier()).thenReturn(1.0);
        when(rideRepository.save(any(Ride.class))).thenAnswer(invocation -> {
            Ride ride = invocation.getArgument(0);
            if (ride.getId() == null) {
                ride.setId(55L);
            }
            return ride;
        });
        when(rideRedisService.claimCustomerActiveRide(1L, 55L)).thenReturn(true);
        when(rideOfferRepository.saveAll(any())).thenAnswer(invocation -> {
            savedOffers.clear();
            savedOffers.addAll(invocation.getArgument(0));
            return savedOffers;
        });
        when(rideOfferRepository.findByRideAndStatusOrderByOfferedAtAsc(any(Ride.class), eq(com.kituirides.api.domain.enums.RideOfferStatus.PENDING)))
            .thenAnswer(invocation -> savedOffers);
        when(paymentRepository.findByRide(any(Ride.class))).thenReturn(Optional.empty());

        RideResponse response = service.createRide(request);

        assertEquals(new BigDecimal("470.00"), response.estimatedFare());
        assertEquals(5, response.etaMinutes());
        assertEquals(1, savedOffers.size());
        assertEquals(11L, savedOffers.get(0).getDriver().getId());
        verify(realtimePublisher).publishDriverOffer(eq(11L), any());
        verify(domainEventPublisher).publishRideEvent(eq(EventType.RIDE_REQUESTED), any(Ride.class));
        verify(domainEventPublisher).publishRideEvent(eq(EventType.DRIVER_MATCHED), any(Ride.class));
    }
}
