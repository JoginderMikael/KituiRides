package com.kituirides.api.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.util.List;

/**
 * Request payload for mpesa callback.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MpesaCallbackRequest(
    BodyPayload Body
) {

    public boolean success() {
        return callback() != null && callback().ResultCode() != null && callback().ResultCode() == 0;
    }

    public String checkoutRequestId() {
        return callback() != null ? callback().CheckoutRequestID() : null;
    }

    public String merchantRequestId() {
        return callback() != null ? callback().MerchantRequestID() : null;
    }

    public Integer resultCode() {
        return callback() != null ? callback().ResultCode() : null;
    }

    public String resultDescription() {
        return callback() != null ? callback().ResultDesc() : null;
    }

    public BigDecimal amount() {
        return decimalItem("Amount");
    }

    public String mpesaReceiptNumber() {
        return stringItem("MpesaReceiptNumber");
    }

    public String phoneNumber() {
        return stringItem("PhoneNumber");
    }

    private StkCallback callback() {
        return Body != null ? Body.stkCallback() : null;
    }

    private String stringItem(String name) {
        CallbackItem item = item(name);
        return item != null && item.Value() != null ? String.valueOf(item.Value()) : null;
    }

    private BigDecimal decimalItem(String name) {
        CallbackItem item = item(name);
        if (item == null || item.Value() == null) {
            return null;
        }
        return new BigDecimal(String.valueOf(item.Value()));
    }

    private CallbackItem item(String name) {
        if (callback() == null || callback().CallbackMetadata() == null || callback().CallbackMetadata().Item() == null) {
            return null;
        }
        return callback().CallbackMetadata().Item().stream()
            .filter(candidate -> name.equals(candidate.Name()))
            .findFirst()
            .orElse(null);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BodyPayload(
        StkCallback stkCallback
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StkCallback(
        String MerchantRequestID,
        String CheckoutRequestID,
        Integer ResultCode,
        String ResultDesc,
        CallbackMetadata CallbackMetadata
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CallbackMetadata(
        List<CallbackItem> Item
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CallbackItem(
        String Name,
        Object Value
    ) {
    }
}
