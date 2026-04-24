package com.kituirides.api.matching;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.payment.PriceCalculationService;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.ride.RideStateMachine;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MatchingServiceTest {

    @Mock private RiderProfileRepository riderProfileRepository;
    @Mock private LocationPingRepository locationPingRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private RideRepository rideRepository;
    @Mock private PriceCalculationService priceCalculationService;

    @Test
    void shouldBuildEligibleDriverResponseFromFetchedUserDetails() {
        RideStateMachine rideStateMachine = new RideStateMachine();
        MatchingService service = new MatchingService(
            riderProfileRepository,
            locationPingRepository,
            vehicleRepository,
            rideRepository,
            rideStateMachine,
            priceCalculationService
        );

        User driver = new User();
        driver.setId(10L);
        driver.setFirstName("Jane");
        driver.setLastName("Driver");
        driver.setRole(Role.DRIVER);

        RiderProfile profile = new RiderProfile();
        profile.setUser(driver);
        profile.setVerified(true);
        profile.setAvailable(true);

        Vehicle vehicle = new Vehicle();
        vehicle.setRiderProfile(profile);
        vehicle.setMake("Toyota");
        vehicle.setModel("Axio");
        vehicle.setPlateNumber("KDL 123A");
        vehicle.setVehicleType(VehicleType.CAR);
        vehicle.setEngineSize(1500);

        LocationPing ping = new LocationPing();
        ping.setUser(driver);
        ping.setLatitude(-1.3710);
        ping.setLongitude(38.0199);
        ping.setTimestamp(Instant.now());

        when(riderProfileRepository.findAllWithUser()).thenReturn(List.of(profile));
        when(vehicleRepository.findByRiderProfile(profile)).thenReturn(Optional.of(vehicle));
        when(rideRepository.existsByRiderAndStatusIn(eq(driver), any())).thenReturn(false);
        when(locationPingRepository.findTopByUserOrderByTimestampDesc(driver)).thenReturn(Optional.of(ping));
        when(rideRepository.countByStatusIn(any())).thenReturn(0L);
        when(riderProfileRepository.findByVerifiedTrueAndAvailableTrue()).thenReturn(List.of(profile));
        when(priceCalculationService.calculatePrice(any(), eq(VehicleType.CAR), eq(1500), any()))
            .thenReturn(new BigDecimal("467.70"));

        List<DriverMatchResult> matches = service.findEligibleDrivers(
            -1.371528,
            38.019692,
            -1.365600,
            38.011966,
            VehicleType.CAR
        );

        assertEquals(1, matches.size());
        assertEquals(10L, matches.get(0).driver().getId());
        assertEquals("Jane Driver", matches.get(0).driverName());
        assertEquals("Toyota Axio", matches.get(0).vehicleModel());
        assertEquals("KDL 123A", matches.get(0).plateNumber());
        assertEquals(new BigDecimal("467.70"), matches.get(0).estimatedPrice());
        assertTrue(matches.get(0).distanceToPickupKm() <= 5.0);
        assertNotNull(matches.get(0).vehicle());
        verify(riderProfileRepository).findAllWithUser();
    }
}
