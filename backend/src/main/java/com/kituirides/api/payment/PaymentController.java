package com.kituirides.api.payment;

import com.kituirides.api.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/mpesa/stk-push")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> initiate(@Valid @RequestBody InitiatePaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.initiatePayment(request), "STK push initiated"));
    }

    @PostMapping("/mpesa/callback")
    public ResponseEntity<ApiResponse<PaymentResponse>> callback(@Valid @RequestBody MpesaCallbackRequest callback) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.handleMpesaCallback(callback), "Callback processed"));
    }

    @GetMapping("/ride/{rideId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DRIVER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentResponse>> getByRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getByRideId(rideId)));
    }
}
