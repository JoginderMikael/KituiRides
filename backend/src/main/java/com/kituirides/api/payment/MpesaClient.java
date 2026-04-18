package com.kituirides.api.payment;

import org.springframework.stereotype.Component;

@Component
public class MpesaClient {

    public boolean initiateStkPush(String phoneNumber, String amount, String transactionRef) {
        return phoneNumber != null && phoneNumber.startsWith("254") && amount != null && transactionRef != null;
    }
}
