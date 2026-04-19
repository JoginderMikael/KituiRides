package com.kituirides.api.payment;

import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.repository.AdminConfigRepository;
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

    private final AdminConfigRepository adminConfigRepository;

    /**
     * Calculate ride price based on distance and vehicle type
     */
    public BigDecimal calculatePrice(BigDecimal distanceKm, VehicleType vehicleType, 
                                     Integer engineSize, Double surgeMultiplier) {
        try {
            // Get admin config values
            BigDecimal baseFare = getConfigAsDecimal("BASE_FARE");
            BigDecimal fuelCostPerLiter = getConfigAsDecimal("FUEL_COST_PER_LITER");
            BigDecimal driverMarkup = getConfigAsDecimal("DRIVER_MARKUP");
            BigDecimal commissionRate = getConfigAsDecimal("COMPANY_COMMISSION_RATE");

            // Get fuel economy based on vehicle type and engine size
            BigDecimal fuelEconomy = getFuelEconomy(vehicleType, engineSize);

            // Calculate price using formula: P = (B + (D/FE × Cf × (1 + M))) / (1 - R)
            BigDecimal fuelCost = calculateFuelCost(distanceKm, fuelEconomy, fuelCostPerLiter);
            BigDecimal markupMultiplier = BigDecimal.ONE.add(driverMarkup);
            BigDecimal priceBeforeCommission = baseFare.add(fuelCost.multiply(markupMultiplier));
            
            // Apply commission: divide by (1 - commissionRate)
            BigDecimal commissionDivisor = BigDecimal.ONE.subtract(commissionRate);
            BigDecimal price = priceBeforeCommission.divide(commissionDivisor, 2, RoundingMode.HALF_UP);

            // Apply surge multiplier if any
            if (surgeMultiplier != null && surgeMultiplier > 1.0) {
                price = price.multiply(BigDecimal.valueOf(surgeMultiplier)).setScale(2, RoundingMode.HALF_UP);
            }

            log.info("Price calculated for distance={}km, vehicleType={}, price={} KES", 
                    distanceKm, vehicleType, price);

            return price;
        } catch (Exception e) {
            log.error("Error calculating price", e);
            // Fallback to simple calculation: 150 + (distance * 65)
            return BigDecimal.valueOf(150).add(distanceKm.multiply(BigDecimal.valueOf(65)));
        }
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
            // Motorcycles have better fuel economy
            return getConfigAsDecimal("MOTORCYCLE_FUEL_ECONOMY");
        }

        // For cars, calculate based on engine size
        if (engineSize != null) {
            if (engineSize <= 1000) {
                return BigDecimal.valueOf(20.0); // 500-1000cc -> 650cc -> 20 km/l
            } else if (engineSize <= 1500) {
                return BigDecimal.valueOf(15.0); // 1000-1500cc -> 1500cc -> 15 km/l
            } else if (engineSize <= 2000) {
                return BigDecimal.valueOf(13.0); // 1500-2000cc -> 1800cc -> 13 km/l
            } else if (engineSize <= 2500) {
                return BigDecimal.valueOf(11.0); // 2000-2500cc -> 2200cc -> 11 km/l
            } else if (engineSize <= 3000) {
                return BigDecimal.valueOf(9.0); // 2500-3000cc -> 2800cc -> 9 km/l
            } else {
                return BigDecimal.valueOf(7.0); // > 3000cc -> 3300cc -> 7 km/l
            }
        }

        // Default car fuel economy
        return BigDecimal.valueOf(12.0);
    }

    /**
     * Get admin config value as BigDecimal
     */
    private BigDecimal getConfigAsDecimal(String configKey) {
        return adminConfigRepository.findByConfigKey(configKey)
                .map(config -> new BigDecimal(config.getConfigValue()))
                .orElse(getDefaultConfigValue(configKey));
    }

    /**
     * Get default config values if not found in database
     */
    private BigDecimal getDefaultConfigValue(String configKey) {
        return switch (configKey) {
            case "BASE_FARE" -> BigDecimal.valueOf(100);
            case "FUEL_COST_PER_LITER" -> BigDecimal.valueOf(200);
            case "DRIVER_MARKUP" -> BigDecimal.valueOf(1.5);
            case "COMPANY_COMMISSION_RATE" -> BigDecimal.valueOf(0.20);
            case "MOTORCYCLE_FUEL_ECONOMY" -> BigDecimal.valueOf(37);
            default -> BigDecimal.valueOf(0);
        };
    }
}
