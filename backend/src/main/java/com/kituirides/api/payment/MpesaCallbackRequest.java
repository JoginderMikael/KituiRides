package com.kituirides.api.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MpesaCallbackRequest(
    @NotBlank String transactionRef,
    @NotNull Boolean success
) {
}
