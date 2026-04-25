package com.kituirides.api.support;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Exposes support contact, ticket queue, and ride dispute resolution endpoints.
 */
@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
@Tag(name = "Support", description = "Support contact, ticket, and ride resolution endpoints")
public class SupportController {

    private final SupportService supportService;

    @GetMapping("/contact")
    @PreAuthorize("isAuthenticated()")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get support contact details", description = "Returns support contact information for any authenticated user.")
    public ResponseEntity<ApiResponse<SupportContactResponse>> contact() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.getSupportContact()));
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "List support tickets", description = "Returns open or assigned tickets for the authenticated support staff member.")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> supportQueue() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.assignedOrOpenTicketsForAgent()));
    }

    @PostMapping("/tickets/{ticketId}/reply")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Reply to a ticket", description = "Adds a support response to an existing ticket conversation.")
    public ResponseEntity<ApiResponse<TicketResponse>> reply(@PathVariable Long ticketId,
                                                             @Valid @RequestBody TicketReplyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.replyToTicket(ticketId, request), "Reply added"));
    }

    @PatchMapping("/tickets/{ticketId}")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Update a ticket", description = "Changes ticket status or assignment details for the specified support ticket.")
    public ResponseEntity<ApiResponse<TicketResponse>> updateStatus(@PathVariable Long ticketId,
                                                                    @Valid @RequestBody UpdateTicketRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.updateTicket(ticketId, request), "Ticket updated"));
    }

    @GetMapping("/rides/{rideId}")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get ride for support review", description = "Returns ride details required during support investigation.")
    public ResponseEntity<ApiResponse<RideResponse>> getRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.getRide(rideId)));
    }

    @PatchMapping("/rides/{rideId}/kms")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Fix ride distance", description = "Updates the stored ride kilometers when support needs to correct a trip record.")
    public ResponseEntity<ApiResponse<RideResponse>> fixKms(@PathVariable Long rideId,
                                                           @RequestParam BigDecimal kms) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.fixRideKms(rideId, kms), "Ride KMs updated"));
    }

    @PatchMapping("/rides/{rideId}/resolve")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Resolve a ride issue", description = "Closes a disputed ride by applying the support resolution payload.")
    public ResponseEntity<ApiResponse<RideResponse>> resolveRide(
        @PathVariable Long rideId,
        @RequestBody(required = false) ResolveRideRequest request
    ) {
        ResolveRideRequest payload = request != null ? request : new ResolveRideRequest(null, null);
        return ResponseEntity.ok(ApiResponse.ok(supportService.resolveRide(rideId, payload), "Ride resolved"));
    }

    @PostMapping("/rides/{rideId}/approve-payment")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Approve payment manually", description = "Forces payment approval for a ride during support intervention.")
    public ResponseEntity<ApiResponse<RideResponse>> forceApprovePayment(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.forceApprovePayment(rideId), "Payment approved by support"));
    }
}
