package com.kituirides.api.payment;

import com.kituirides.api.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Exposes payment initiation, callback, lookup, and cash approval endpoints.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment initiation, callbacks, and approval endpoints")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/mpesa/stk-push")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN', 'SUPPORT_AGENT')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(
        summary = "Initiate an M-Pesa STK push",
        description = "Starts an M-Pesa payment request for the supplied ride and payment details."
    )
    public ResponseEntity<ApiResponse<PaymentResponse>> initiate(@Valid @RequestBody InitiatePaymentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.initiatePayment(request), "STK push initiated"));
    }

    @PostMapping("/mpesa/callback")
    @Operation(
        summary = "Handle an M-Pesa callback",
        description = "Processes the asynchronous callback received from the M-Pesa platform."
    )
    public ResponseEntity<ApiResponse<PaymentResponse>> callback(@Valid @RequestBody MpesaCallbackRequest callback) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.handleMpesaCallback(callback), "Callback processed"));
    }

    @GetMapping("/ride/{rideId}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'DRIVER', 'ADMIN', 'SUPPORT_AGENT')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(
        summary = "Get payment by ride",
        description = "Returns payment details associated with the supplied ride identifier."
    )
    public ResponseEntity<ApiResponse<PaymentResponse>> getByRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.getByRideId(rideId)));
    }

    @PostMapping("/ride/{rideId}/mpesa-prompt")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN', 'SUPPORT_AGENT')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(
        summary = "Prompt customer for M-Pesa payment",
        description = "Allows the assigned driver to send an STK push to the customer's registered phone number."
    )
    public ResponseEntity<ApiResponse<PaymentResponse>> promptCustomerMpesa(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(
            paymentService.promptCustomerMpesaPayment(rideId),
            "M-Pesa prompt sent to customer"
        ));
    }

    @PostMapping("/ride/{rideId}/approve-cash")
    @PreAuthorize("hasAnyRole('DRIVER', 'ADMIN', 'SUPPORT_AGENT')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(
        summary = "Approve a cash payment",
        description = "Confirms cash payment for a ride and optionally records a manual distance."
    )
    public ResponseEntity<ApiResponse<PaymentResponse>> approveCash(
        @PathVariable Long rideId,
        @RequestBody(required = false) ApproveCashPaymentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            paymentService.approveCashPayment(rideId, request != null ? request.manualDistanceKm() : null),
            "Cash payment approved"
        ));
    }
}
