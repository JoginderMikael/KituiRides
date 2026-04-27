package com.kituirides.api.payment;

import jakarta.annotation.PostConstruct;
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

/**
 * Supports mpesa client operations.
 */
@Slf4j
@Component
public class MpesaClient {

    private static final DateTimeFormatter TIMESTAMP_FORMATTER =
        DateTimeFormatter.ofPattern("yyyyMMddHHmmss").withZone(ZoneId.of("Africa/Nairobi"));
    private static final String DEFAULT_TRANSACTION_DESCRIPTION = "Ride payment";

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

    @Value("${app.mpesa.transaction-type:CustomerPayBillOnline}")
    private String transactionType;

    @Value("${app.mpesa.simulated:true}")
    private boolean simulated;

    @PostConstruct
    void validateConfiguration() {
        if (simulated) {
            return;
        }

        requireConfigured("app.mpesa.consumer-key", consumerKey);
        requireConfigured("app.mpesa.consumer-secret", consumerSecret);
        requireConfigured("app.mpesa.shortcode", shortcode);
        requireConfigured("app.mpesa.passkey", passkey);
        requireConfigured("app.mpesa.callback-url", callbackUrl);

        if (!callbackUrl.startsWith("https://")) {
            throw new IllegalStateException("app.mpesa.callback-url must use HTTPS when real M-Pesa calls are enabled");
        }
        if (callbackUrl.contains("example.com") || callbackUrl.contains("your-public-domain")) {
            throw new IllegalStateException("app.mpesa.callback-url must be replaced with a real public callback URL");
        }
    }

    public MpesaStkPushResult initiateStkPush(String phoneNumber, String amount, String transactionRef) {
        if (phoneNumber == null || !phoneNumber.matches("254\\d{9}") || amount == null || transactionRef == null) {
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
            Map.entry("TransactionType", transactionType),
            Map.entry("Amount", amount),
            Map.entry("PartyA", phoneNumber),
            Map.entry("PartyB", shortcode),
            Map.entry("PhoneNumber", phoneNumber),
            Map.entry("CallBackURL", callbackUrl),
            Map.entry("AccountReference", transactionRef),
            Map.entry("TransactionDesc", DEFAULT_TRANSACTION_DESCRIPTION)
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

    private void requireConfigured(String propertyName, String value) {
        if (value == null || value.isBlank() || value.contains("replace-with-") || value.startsWith("sandbox-")) {
            throw new IllegalStateException(propertyName + " must be configured before real M-Pesa calls are enabled");
        }
    }
}
