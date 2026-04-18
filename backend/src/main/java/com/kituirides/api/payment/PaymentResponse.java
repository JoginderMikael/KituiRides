package com.kituirides.api.payment;

import com.kituirides.api.domain.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
    Long id,
    Long rideId,
    BigDecimal amount,
    String phoneNumber,
    String transactionRef,
    PaymentStatus status,
    Instant createdAt
) {
}
