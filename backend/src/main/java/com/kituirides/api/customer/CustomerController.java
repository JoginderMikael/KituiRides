package com.kituirides.api.customer;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.location.LocationService;
import com.kituirides.api.location.NearbyDriverResponse;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.ride.CreateRideRequest;
import com.kituirides.api.ride.RideEstimateResponse;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.support.CreateTicketRequest;
import com.kituirides.api.support.RaiseRideDisputeRequest;
import com.kituirides.api.support.SupportService;
import com.kituirides.api.support.TicketResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes customer-facing ride booking, estimation, discovery, and ticketing operations.
 */
@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@Tag(name = "Customer", description = "Customer ride booking and support endpoints")
@SecurityRequirement(name = "bearerAuth")
public class CustomerController {

    private final RideService rideService;
    private final LocationService locationService;
    private final SupportService supportService;

    @PostMapping("/rides")
    @Operation(summary = "Request a ride", description = "Creates a new ride request for the authenticated customer.")
    public ResponseEntity<ApiResponse<RideResponse>> requestRide(@Valid @RequestBody CreateRideRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.createRide(request), "Ride requested"));
    }

    @GetMapping("/rides")
    @Operation(summary = "List my rides", description = "Returns all rides that belong to the authenticated customer.")
    public ResponseEntity<ApiResponse<List<RideResponse>>> myRides() {
        return ResponseEntity.ok(ApiResponse.ok(rideService.myCustomerRides()));
    }

    @GetMapping("/rides/estimate")
    @Operation(
        summary = "Estimate a ride fare",
        description = "Calculates a fare estimate for the supplied trip coordinates and vehicle type."
    )
    public ResponseEntity<ApiResponse<RideEstimateResponse>> estimateRide(
        @RequestParam double pickupLat,
        @RequestParam double pickupLng,
        @RequestParam double dropoffLat,
        @RequestParam double dropoffLng,
        @RequestParam VehicleType vehicleType
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            rideService.estimateRide(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType)
        ));
    }

    @GetMapping("/rides/{id}")
    @Operation(summary = "Get ride details", description = "Returns a single customer ride by its identifier.")
    public ResponseEntity<ApiResponse<RideResponse>> rideById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.customerRideById(id)));
    }

    @GetMapping("/nearby-drivers")
    @Operation(
        summary = "Find nearby drivers",
        description = "Returns nearby available drivers for the supplied trip coordinates and vehicle type."
    )
    public ResponseEntity<ApiResponse<List<NearbyDriverResponse>>> nearbyDrivers(
        @RequestParam double pickupLat,
        @RequestParam double pickupLng,
        @RequestParam double dropoffLat,
        @RequestParam double dropoffLng,
        @RequestParam VehicleType vehicleType
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            locationService.nearbyDrivers(pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType)
        ));
    }

    @PostMapping("/rides/{id}/cancel")
    @Operation(summary = "Cancel a ride", description = "Cancels an existing ride belonging to the authenticated customer.")
    public ResponseEntity<ApiResponse<RideResponse>> cancelRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.cancelRide(id), "Ride cancelled"));
    }

    @PostMapping("/rides/{id}/complete")
    @Operation(summary = "Complete a ride", description = "Marks a ride as completed from the customer side.")
    public ResponseEntity<ApiResponse<RideResponse>> completeRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.completeRide(id), "Ride completed"));
    }

    @PostMapping("/rides/{id}/dispute")
    @Operation(summary = "Open a ride dispute", description = "Creates a support dispute for a completed or problematic ride.")
    public ResponseEntity<ApiResponse<RideResponse>> disputeRide(
        @PathVariable Long id,
        @Valid @RequestBody RaiseRideDisputeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            supportService.raiseRideDispute(id, request.reason()),
            "Ride dispute opened"
        ));
    }

    @PostMapping("/tickets")
    @Operation(summary = "Create a support ticket", description = "Creates a general support ticket for the authenticated customer.")
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(@Valid @RequestBody CreateTicketRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.createTicket(request), "Ticket created"));
    }

    @GetMapping("/tickets")
    @Operation(summary = "List my tickets", description = "Returns support tickets created by the authenticated customer.")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> myTickets() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.myTickets()));
    }
}
