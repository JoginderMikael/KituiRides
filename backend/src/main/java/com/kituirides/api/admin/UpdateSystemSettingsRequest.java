package com.kituirides.api.admin;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateSystemSettingsRequest(
    @NotNull(message = "Base fare is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Base fare must be at least 0")
    @Digits(integer = 8, fraction = 2, message = "Base fare format is invalid")
    BigDecimal baseFare,

    @NotNull(message = "Fuel cost per liter is required")
    @DecimalMin(value = "0.00", inclusive = false, message = "Fuel cost per liter must be greater than 0")
    @Digits(integer = 8, fraction = 2, message = "Fuel cost per liter format is invalid")
    BigDecimal fuelCostPerLiter,

    @NotNull(message = "Driver markup is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Driver markup must be at least 0")
    @DecimalMax(value = "5.00", inclusive = true, message = "Driver markup must not exceed 5.00")
    @Digits(integer = 3, fraction = 4, message = "Driver markup format is invalid")
    BigDecimal driverMarkup,

    @NotNull(message = "Company commission is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Company commission must be at least 0")
    @DecimalMax(value = "0.95", inclusive = false, message = "Company commission must be less than 0.95")
    @Digits(integer = 1, fraction = 4, message = "Company commission format is invalid")
    BigDecimal companyCommissionRate,

    @NotBlank(message = "Support phone number is required")
    @Size(max = 50, message = "Support phone number is too long")
    String supportPhoneNumber,

    @NotBlank(message = "Support email is required")
    @Email(message = "Support email must be valid")
    @Size(max = 255, message = "Support email is too long")
    String supportEmailAddress,

    @NotBlank(message = "Support help label is required")
    @Size(max = 255, message = "Support help label is too long")
    String supportHelpLabel,

    @NotBlank(message = "Support escalation contact is required")
    @Size(max = 255, message = "Support escalation contact is too long")
    String supportEscalationContact,

    @NotNull(message = "Emergency contact visibility is required")
    Boolean emergencyContactVisible
) {
}
