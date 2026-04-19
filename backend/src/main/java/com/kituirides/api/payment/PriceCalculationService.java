package com.kituirides.api.payment;

import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.admin.AdminSettingsService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * PriceCalculationService - Calculates dynamic pricing based on fuel economy, distance, and admin config
 * Formula: P = (B + (D/FE × Cf × (1 + M))) / (1 - R)
 * 
 * Where:
 * B = Base Fare (from admin config)
 * D = Distance in km
 * FE = Fuel Economy (km/liter, based on vehicle type and engine size)
 * Cf = Fuel Cost per Liter (from admin config)
 * M = Driver Markup (from admin config)
 * R = Company Commission Rate (from admin config)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PriceCalculationService {

    private static final BigDecimal MOTORCYCLE_FUEL_ECONOMY = BigDecimal.valueOf(37);

    private final AdminSettingsService adminSettingsService;

    /**
     * Calculate ride price based on distance and vehicle type
     */
    public BigDecimal calculatePrice(BigDecimal distanceKm, VehicleType vehicleType, 
                                     Integer engineSize, Double surgeMultiplier) {
        BigDecimal sanitizedDistance = distanceKm == null
            ? BigDecimal.ZERO
            : distanceKm.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        BigDecimal baseFare = getConfigAsDecimal("BASE_FARE");
        BigDecimal fuelCostPerLiter = getConfigAsDecimal("FUEL_COST_PER_LITER");
        BigDecimal driverMarkup = getConfigAsDecimal("DRIVER_MARKUP");
        BigDecimal commissionRate = getConfigAsDecimal("COMPANY_COMMISSION_RATE");
        BigDecimal fuelEconomy = getFuelEconomy(vehicleType, engineSize);

        BigDecimal fuelCost = calculateFuelCost(sanitizedDistance, fuelEconomy, fuelCostPerLiter);
        BigDecimal markupMultiplier = BigDecimal.ONE.add(driverMarkup);
        BigDecimal priceBeforeCommission = baseFare.add(fuelCost.multiply(markupMultiplier));
        BigDecimal commissionDivisor = BigDecimal.ONE.subtract(commissionRate);
        if (commissionDivisor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("COMPANY_COMMISSION_RATE must be less than 1.0");
        }

        BigDecimal price = priceBeforeCommission.divide(commissionDivisor, 2, RoundingMode.HALF_UP);
        if (surgeMultiplier != null && surgeMultiplier > 1.0) {
            price = price.multiply(BigDecimal.valueOf(surgeMultiplier)).setScale(2, RoundingMode.HALF_UP);
        }

        log.info("Price calculated for distance={}km, vehicleType={}, price={} KES",
            sanitizedDistance, vehicleType, price);
        return price;
    }

    /**
     * Calculate fuel cost for a given distance
     */
    private BigDecimal calculateFuelCost(BigDecimal distanceKm, BigDecimal fuelEconomy, 
                                         BigDecimal fuelCostPerLiter) {
        // Fuel cost = (distance / fuel_economy) * fuel_cost_per_liter
        BigDecimal litersNeeded = distanceKm.divide(fuelEconomy, 2, RoundingMode.HALF_UP);
        return litersNeeded.multiply(fuelCostPerLiter);
    }

    /**
     * Get fuel economy (km/liter) based on vehicle type and engine size
     */
    private BigDecimal getFuelEconomy(VehicleType vehicleType, Integer engineSize) {
        if (vehicleType == VehicleType.MOTORCYCLE) {
            return MOTORCYCLE_FUEL_ECONOMY;
        }

        if (engineSize == null || engineSize <= 1000) {
            return BigDecimal.valueOf(20);
        }
        if (engineSize <= 1500) {
            return BigDecimal.valueOf(15);
        }
        if (engineSize <= 2000) {
            return BigDecimal.valueOf(13);
        }
        if (engineSize <= 2500) {
            return BigDecimal.valueOf(11);
        }
        if (engineSize <= 3000) {
            return BigDecimal.valueOf(9);
        }
        return BigDecimal.valueOf(7);
    }

    /**
     * Get admin config value as BigDecimal
     */
    private BigDecimal getConfigAsDecimal(String configKey) {
        String value = adminSettingsService.getConfigValue(configKey);
        if (value == null) {
            throw new IllegalStateException("Missing admin config value for " + configKey);
        }
        return new BigDecimal(value);
    }
}
