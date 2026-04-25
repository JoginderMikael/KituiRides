package com.kituirides.api.admin;

import java.math.BigDecimal;

/**
 * Immutable data type for pricing configuration snapshot.
 */
public record PricingConfigurationSnapshot(
    BigDecimal baseFare,
    BigDecimal fuelCostPerLiter,
    BigDecimal driverMarkup,
    BigDecimal companyCommissionRate,
    BigDecimal motorcycleFuelEconomy
) {
}
