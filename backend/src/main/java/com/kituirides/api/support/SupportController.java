package com.kituirides.api.support;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideResponse;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @GetMapping("/tickets")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> supportQueue() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.assignedOrOpenTicketsForAgent()));
    }

    @PostMapping("/tickets/{ticketId}/reply")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<ApiResponse<TicketResponse>> reply(@PathVariable Long ticketId,
                                                             @Valid @RequestBody TicketReplyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.replyToTicket(ticketId, request), "Reply added"));
    }

    @PatchMapping("/tickets/{ticketId}")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<ApiResponse<TicketResponse>> updateStatus(@PathVariable Long ticketId,
                                                                    @Valid @RequestBody UpdateTicketRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.updateTicket(ticketId, request), "Ticket updated"));
    }

    @PatchMapping("/rides/{rideId}/kms")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<ApiResponse<RideResponse>> fixKms(@PathVariable Long rideId,
                                                           @RequestParam BigDecimal kms) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.fixRideKms(rideId, kms), "Ride KMs updated"));
    }

    @PostMapping("/rides/{rideId}/approve-payment")
    @PreAuthorize("hasRole('SUPPORT_AGENT')")
    public ResponseEntity<ApiResponse<RideResponse>> forceApprovePayment(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.forceApprovePayment(rideId), "Payment approved by support"));
    }
}
