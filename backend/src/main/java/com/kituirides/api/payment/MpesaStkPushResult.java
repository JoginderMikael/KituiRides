package com.kituirides.api.payment;

public record MpesaStkPushResult(
    boolean success,
    String responseCode,
    String responseDescription,
    String checkoutRequestId,
    String merchantRequestId
) {
}
