package com.kituirides.api.payment;

import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
    Long id,
    Long rideId,
    BigDecimal amount,
    String phoneNumber,
    String transactionRef,
    PaymentType paymentType,
    PaymentStatus status,
    String providerCheckoutRequestId,
    String providerMerchantRequestId,
    String providerReceiptNumber,
    String providerResponseCode,
    String providerResponseDescription,
    Instant createdAt,
    Instant completedAt
) {
}
