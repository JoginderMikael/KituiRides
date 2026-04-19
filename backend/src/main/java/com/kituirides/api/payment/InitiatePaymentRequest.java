package com.kituirides.api.payment;

import java.math.BigDecimal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InitiatePaymentRequest(
    @NotNull Long rideId,
    @NotBlank String phoneNumber,
    BigDecimal manualDistanceKm
) {
}
