package com.kituirides.api.event.payment;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.event.BaseEvent;
import com.kituirides.api.event.EventType;
import java.math.BigDecimal;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class PaymentEvent extends BaseEvent {
    private Long paymentId;
    private Long customerId;
    private BigDecimal amount;
    private PaymentType method;
    private PaymentStatus status;
    private String mpesaReceiptNumber;

    public PaymentEvent() {
    }

    public PaymentEvent(
        EventType eventType,
        Long paymentId,
        Long rideId,
        Long customerId,
        BigDecimal amount,
        PaymentType method,
        PaymentStatus status,
        String mpesaReceiptNumber
    ) {
        super(eventType, customerId, rideId, paymentId != null ? "payment-" + paymentId : null);
        this.paymentId = paymentId;
        this.customerId = customerId;
        this.amount = amount;
        this.method = method;
        this.status = status;
        this.mpesaReceiptNumber = mpesaReceiptNumber;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public PaymentType getMethod() {
        return method;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getMpesaReceiptNumber() {
        return mpesaReceiptNumber;
    }
}
