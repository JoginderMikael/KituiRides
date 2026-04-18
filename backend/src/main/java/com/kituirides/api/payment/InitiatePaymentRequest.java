package com.kituirides.api.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InitiatePaymentRequest(
    @NotNull Long rideId,
    @NotBlank String phoneNumber
) {
}
