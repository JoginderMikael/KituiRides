package com.kituirides.api.admin;

import java.util.Arrays;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum AdminSettingKey {
    BASE_FARE(
        "pricing",
        "Base Fare",
        "Starting fare applied to every trip quote before fuel and markup are added.",
        "KES",
        "150",
        10,
        true
    ),
    FUEL_COST_PER_LITER(
        "pricing",
        "Fuel Cost Per Liter",
        "Reference pump price used to estimate distance-based trip operating cost.",
        "KES/L",
        "200",
        20,
        true
    ),
    DRIVER_MARKUP(
        "pricing",
        "Driver Markup",
        "Markup ratio applied on top of fuel cost before company commission is accounted for.",
        "ratio",
        "1.5",
        30,
        true
    ),
    COMPANY_COMMISSION_RATE(
        "pricing",
        "Company Commission",
        "Platform commission ratio deducted from the final trip price.",
        "ratio",
        "0.20",
        40,
        true
    ),
    MOTORCYCLE_FUEL_ECONOMY(
        "pricing",
        "Motorcycle Fuel Economy",
        "Internal fuel economy reference used for motorcycle fare calculations.",
        "km/L",
        "37",
        50,
        false
    ),
    SUPPORT_PHONE_NUMBER(
        "support",
        "Support Hotline",
        "Primary support number shown to riders and drivers.",
        "phone",
        "+254797753625",
        60,
        true
    ),
    SUPPORT_EMAIL_ADDRESS(
        "support",
        "Support Email",
        "Primary support email address for rider and driver escalation flows.",
        "email",
        "support@kituirides.com",
        70,
        true
    ),
    SUPPORT_HELP_LABEL(
        "support",
        "Support Help Label",
        "Short help text shown in support and assistance entry points.",
        "text",
        "Need help with your trip? Reach KituiRides support.",
        80,
        true
    ),
    SUPPORT_ESCALATION_CONTACT(
        "support",
        "Escalation Contact",
        "Escalation contact or team alias used for higher-severity support follow-up.",
        "text",
        "Ops escalation desk",
        90,
        true
    ),
    SUPPORT_EMERGENCY_CONTACT_VISIBLE(
        "support",
        "Emergency Contact Visibility",
        "Controls whether the emergency contact callout is visible in support surfaces.",
        "boolean",
        "true",
        100,
        true
    );

    private static final Map<String, AdminSettingKey> BY_CONFIG_KEY = Arrays.stream(values())
        .collect(Collectors.toMap(AdminSettingKey::configKey, Function.identity()));

    private final String configKey;
    private final String section;
    private final String label;
    private final String description;
    private final String unit;
    private final String defaultValue;
    private final int displayOrder;
    private final boolean exposedInUi;

    AdminSettingKey(
        String section,
        String label,
        String description,
        String unit,
        String defaultValue,
        int displayOrder,
        boolean exposedInUi
    ) {
        this.configKey = name();
        this.section = section;
        this.label = label;
        this.description = description;
        this.unit = unit;
        this.defaultValue = defaultValue;
        this.displayOrder = displayOrder;
        this.exposedInUi = exposedInUi;
    }

    public String configKey() {
        return configKey;
    }

    public String section() {
        return section;
    }

    public String label() {
        return label;
    }

    public String description() {
        return description;
    }

    public String unit() {
        return unit;
    }

    public String defaultValue() {
        return defaultValue;
    }

    public int displayOrder() {
        return displayOrder;
    }

    public boolean exposedInUi() {
        return exposedInUi;
    }

    public static AdminSettingKey fromConfigKey(String configKey) {
        return BY_CONFIG_KEY.get(configKey);
    }
}
