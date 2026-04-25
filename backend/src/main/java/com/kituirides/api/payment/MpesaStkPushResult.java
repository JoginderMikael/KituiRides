package com.kituirides.api.payment;

/**
 * Result payload for mpesa stk push.
 */
public record MpesaStkPushResult(
    boolean success,
    String responseCode,
    String responseDescription,
    String checkoutRequestId,
    String merchantRequestId
) {
}
