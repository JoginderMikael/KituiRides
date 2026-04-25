package com.kituirides.api.payment;

import java.math.BigDecimal;

/**
 * Request payload for approve cash payment.
 */
public record ApproveCashPaymentRequest(
    BigDecimal manualDistanceKm
) {
}
