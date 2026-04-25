package com.kituirides.api.driver;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideOfferResponse;
import com.kituirides.api.ride.RideResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
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
 * Exposes driver dashboard, ride lifecycle, and vehicle management endpoints.
 */
@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
@Tag(name = "Driver", description = "Driver dashboard, ride handling, and vehicle operations")
@SecurityRequirement(name = "bearerAuth")
public class DriverController {

    private final DriverService driverService;

    @GetMapping("/dashboard")
    @Operation(summary = "Get driver dashboard", description = "Returns the authenticated driver's dashboard overview and current status.")
    public ResponseEntity<ApiResponse<DriverDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(driverService.dashboard()));
    }

    @PostMapping("/status")
    @Operation(summary = "Update driver status", description = "Changes the driver's availability or operational status.")
    public ResponseEntity<ApiResponse<DriverDashboardResponse>> updateStatus(@Valid @RequestBody UpdateDriverStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.updateStatus(request), "Driver status updated"));
    }

    @GetMapping("/rides")
    @Operation(summary = "List assigned rides", description = "Returns rides associated with the authenticated driver.")
    public ResponseEntity<ApiResponse<List<RideResponse>>> rides() {
        return ResponseEntity.ok(ApiResponse.ok(driverService.rides()));
    }

    @GetMapping("/offers")
    @Operation(summary = "List ride offers", description = "Returns ride offers currently available to the authenticated driver.")
    public ResponseEntity<ApiResponse<List<RideOfferResponse>>> offers() {
        return ResponseEntity.ok(ApiResponse.ok(driverService.offers()));
    }

    @GetMapping("/rides/{id}")
    @Operation(summary = "Get ride details", description = "Returns a specific ride assigned to the authenticated driver.")
    public ResponseEntity<ApiResponse<RideResponse>> rideById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.rideById(id)));
    }

    @PostMapping("/rides/{id}/accept")
    @Operation(summary = "Accept a ride", description = "Accepts a pending ride offer for the authenticated driver.")
    public ResponseEntity<ApiResponse<RideResponse>> acceptRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.acceptRide(id), "Ride accepted"));
    }

    @PostMapping("/rides/{id}/reject")
    @Operation(summary = "Reject a ride", description = "Rejects a pending ride offer for the authenticated driver.")
    public ResponseEntity<ApiResponse<RideResponse>> rejectRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.rejectRide(id), "Ride rejected"));
    }

    @PostMapping("/rides/{id}/arrive")
    @Operation(summary = "Mark arrival", description = "Marks the driver as having arrived at the pickup location.")
    public ResponseEntity<ApiResponse<RideResponse>> markArrival(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.markArrival(id), "Driver marked as arrived"));
    }

    @PostMapping("/rides/{id}/start")
    @Operation(summary = "Start a ride", description = "Marks an accepted ride as started.")
    public ResponseEntity<ApiResponse<RideResponse>> startRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.startRide(id), "Ride started"));
    }

    @PostMapping("/rides/{id}/complete")
    @Operation(summary = "Complete a ride", description = "Marks an in-progress ride as completed from the driver side.")
    public ResponseEntity<ApiResponse<RideResponse>> completeRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.completeRide(id), "Ride completed"));
    }

    @PostMapping("/rides/{id}/cancel")
    @Operation(summary = "Cancel a ride", description = "Cancels an active ride and submits a cancellation reason for review.")
    public ResponseEntity<ApiResponse<RideResponse>> cancelRide(
        @PathVariable Long id,
        @Valid @RequestBody CancelRideRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            driverService.cancelRide(id, request.reason()),
            "Ride cancelled and sent to support review"
        ));
    }

    @PostMapping("/rides/{id}/distance")
    @Operation(summary = "Submit manual distance", description = "Stores a manually entered ride distance for support and payment workflows.")
    public ResponseEntity<ApiResponse<RideResponse>> updateManualDistance(
        @PathVariable Long id,
        @Valid @RequestBody ManualDistanceRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            driverService.submitManualDistance(id, request.distanceKm()),
            "Manual distance saved"
        ));
    }

    @PostMapping("/vehicle")
    @Operation(summary = "Update vehicle details", description = "Updates the authenticated driver's registered vehicle details.")
    public ResponseEntity<ApiResponse<Void>> updateVehicle(@Valid @RequestBody UpdateVehicleDetailsRequest request) {
        driverService.updateVehicleDetails(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Vehicle details updated"));
    }

    /**
     * Request body used when a driver submits a manual trip distance.
     *
     * @param distanceKm manually recorded distance in kilometers
     */
    public record ManualDistanceRequest(
        @NotNull @DecimalMin("0.0") BigDecimal distanceKm
    ) {
    }

    /**
     * Request body used when a driver cancels a ride.
     *
     * @param reason business reason supplied for the cancellation
     */
    public record CancelRideRequest(
        @NotBlank String reason
    ) {
    }
}
