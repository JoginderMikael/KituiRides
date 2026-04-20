package com.kituirides.api.admin;

import java.math.BigDecimal;

public record PricingConfigurationSnapshot(
    BigDecimal baseFare,
    BigDecimal fuelCostPerLiter,
    BigDecimal driverMarkup,
    BigDecimal companyCommissionRate,
    BigDecimal motorcycleFuelEconomy
) {
}
