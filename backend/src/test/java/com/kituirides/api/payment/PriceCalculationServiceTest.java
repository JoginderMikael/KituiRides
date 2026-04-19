package com.kituirides.api.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.domain.enums.VehicleType;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PriceCalculationServiceTest {

    @Mock
    private AdminSettingsService adminSettingsService;

    private PriceCalculationService service;

    @BeforeEach
    void setUp() {
        service = new PriceCalculationService(adminSettingsService);
        when(adminSettingsService.getConfigValue("BASE_FARE")).thenReturn("150");
        when(adminSettingsService.getConfigValue("FUEL_COST_PER_LITER")).thenReturn("200");
        when(adminSettingsService.getConfigValue("DRIVER_MARKUP")).thenReturn("1.5");
        when(adminSettingsService.getConfigValue("COMPANY_COMMISSION_RATE")).thenReturn("0.20");
    }

    @Test
    void shouldCalculateCarFareUsingNormalizedEngineBand() {
        BigDecimal price = service.calculatePrice(new BigDecimal("10"), VehicleType.CAR, 1500, 1.0);
        assertEquals(new BigDecimal("606.25"), price);
    }

    @Test
    void shouldUseMotorcycleFuelEconomyFlatRate() {
        BigDecimal price = service.calculatePrice(new BigDecimal("10"), VehicleType.MOTORCYCLE, null, 1.0);
        assertEquals(new BigDecimal("356.25"), price);
    }

    @Test
    void shouldRejectCommissionRateOfOneOrMore() {
        when(adminSettingsService.getConfigValue("COMPANY_COMMISSION_RATE")).thenReturn("1.00");

        IllegalStateException exception = assertThrows(
            IllegalStateException.class,
            () -> service.calculatePrice(new BigDecimal("5"), VehicleType.CAR, 1800, 1.0)
        );

        assertEquals("COMPANY_COMMISSION_RATE must be less than 1.0", exception.getMessage());
    }
}
