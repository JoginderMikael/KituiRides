package com.kituirides.api.admin;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response payload for system settings.
 */
public record SystemSettingsResponse(
    SettingsSummary summary,
    PricingSettings pricing,
    SupportSettings support
) {
    public record SettingsSummary(
        String cacheStatus,
        String databaseStatus,
        Instant lastUpdatedAt,
        String lastUpdatedByName,
        Instant cacheRefreshedAt,
        Long configurationVersion,
        Integer persistedSettings,
        Integer cachedSettings
    ) {}

    public record PricingSettings(
        BigDecimal baseFare,
        BigDecimal fuelCostPerLiter,
        BigDecimal driverMarkup,
        BigDecimal companyCommissionRate,
        BigDecimal motorcycleFuelEconomy
    ) {}

    public record SupportSettings(
        String supportPhoneNumber,
        String supportEmailAddress,
        String supportHelpLabel,
        String supportEscalationContact,
        Boolean emergencyContactVisible
    ) {}
}
