package com.kituirides.api.payment;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class MpesaClient {

    private static final DateTimeFormatter TIMESTAMP_FORMATTER =
        DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Africa/Nairobi"));

    private final RestClient restClient = RestClient.builder().build();

    @Value("${app.mpesa.base-url:https://sandbox.safaricom.co.ke}")
    private String baseUrl;

    @Value("${app.mpesa.shortcode}")
    private String shortcode;

    @Value("${app.mpesa.passkey}")
    private String passkey;

    @Value("${app.mpesa.callback-url}")
    private String callbackUrl;

    @Value("${app.mpesa.consumer-key}")
    private String consumerKey;

    @Value("${app.mpesa.consumer-secret}")
    private String consumerSecret;

    @Value("${app.mpesa.simulated:true}")
    private boolean simulated;

    public MpesaStkPushResult initiateStkPush(String phoneNumber, String amount, String transactionRef) {
        if (phoneNumber == null || !phoneNumber.startsWith("254") || amount == null || transactionRef == null) {
            return new MpesaStkPushResult(false, "400", "Invalid STK push request", null, null);
        }

        if (simulated) {
            String suffix = String.valueOf(Instant.now().toEpochMilli());
            return new MpesaStkPushResult(
                true,
                "0",
                "Simulated STK push accepted",
                "ws_CO_" + suffix,
                "ws_MR_" + suffix
            );
        }

        String timestamp = TIMESTAMP_FORMATTER.format(Instant.now());
        String password = Base64.getEncoder().encodeToString((shortcode + passkey + timestamp).getBytes(StandardCharsets.UTF_8));
        String accessToken = fetchAccessToken();

        Map<String, Object> body = Map.ofEntries(
            Map.entry("BusinessShortCode", shortcode),
            Map.entry("Password", password),
            Map.entry("Timestamp", timestamp),
            Map.entry("TransactionType", "CustomerPayBillOnline"),
            Map.entry("Amount", amount),
            Map.entry("PartyA", phoneNumber),
            Map.entry("PartyB", shortcode),
            Map.entry("PhoneNumber", phoneNumber),
            Map.entry("CallBackURL", callbackUrl),
            Map.entry("AccountReference", transactionRef),
            Map.entry("TransactionDesc", "KituiRides trip payment")
        );

        Map<String, Object> response = restClient.post()
            .uri(baseUrl + "/mpesa/stkpush/v1/processrequest")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .body(body)
            .retrieve()
            .body(new ParameterizedTypeReference<Map<String, Object>>() {});

        String responseCode = stringValue(response.get("ResponseCode"));
        String responseDescription = stringValue(
            response.getOrDefault("ResponseDescription", response.get("CustomerMessage"))
        );
        MpesaStkPushResult result = new MpesaStkPushResult(
            Objects.equals("0", responseCode),
            responseCode,
            responseDescription,
            stringValue(response.get("CheckoutRequestID")),
            stringValue(response.get("MerchantRequestID"))
        );
        log.info("M-Pesa STK initiated for {} with response code {}", phoneNumber, responseCode);
        return result;
    }

    private String fetchAccessToken() {
        String basicAuth = Base64.getEncoder()
            .encodeToString((consumerKey + ":" + consumerSecret).getBytes(StandardCharsets.UTF_8));

        Map<String, Object> tokenResponse = restClient.get()
            .uri(baseUrl + "/oauth/v1/generate?grant_type=client_credentials")
            .header(HttpHeaders.AUTHORIZATION, "Basic " + basicAuth)
            .retrieve()
            .body(new ParameterizedTypeReference<Map<String, Object>>() {});

        String accessToken = stringValue(tokenResponse.get("access_token"));
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("M-Pesa access token was not returned");
        }
        return accessToken;
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
