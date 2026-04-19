package com.kituirides.api.payment;

import java.math.BigDecimal;

public record ApproveCashPaymentRequest(
    BigDecimal manualDistanceKm
) {
}
