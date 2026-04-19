package com.kituirides.api.driver;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideOfferResponse;
import com.kituirides.api.ride.RideResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
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

@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class DriverController {

    private final DriverService driverService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DriverDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(driverService.dashboard()));
    }

    @PostMapping("/status")
    public ResponseEntity<ApiResponse<DriverDashboardResponse>> updateStatus(@Valid @RequestBody UpdateDriverStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.updateStatus(request), "Driver status updated"));
    }

    @GetMapping("/rides")
    public ResponseEntity<ApiResponse<List<RideResponse>>> rides() {
        return ResponseEntity.ok(ApiResponse.ok(driverService.rides()));
    }

    @GetMapping("/offers")
    public ResponseEntity<ApiResponse<List<RideOfferResponse>>> offers() {
        return ResponseEntity.ok(ApiResponse.ok(driverService.offers()));
    }

    @GetMapping("/rides/{id}")
    public ResponseEntity<ApiResponse<RideResponse>> rideById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.rideById(id)));
    }

    @PostMapping("/rides/{id}/accept")
    public ResponseEntity<ApiResponse<RideResponse>> acceptRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.acceptRide(id), "Ride accepted"));
    }

    @PostMapping("/rides/{id}/reject")
    public ResponseEntity<ApiResponse<RideResponse>> rejectRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.rejectRide(id), "Ride rejected"));
    }

    @PostMapping("/rides/{id}/arrive")
    public ResponseEntity<ApiResponse<RideResponse>> markArrival(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.markArrival(id), "Driver marked as arrived"));
    }

    @PostMapping("/rides/{id}/start")
    public ResponseEntity<ApiResponse<RideResponse>> startRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.startRide(id), "Ride started"));
    }

    @PostMapping("/rides/{id}/complete")
    public ResponseEntity<ApiResponse<RideResponse>> completeRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.completeRide(id), "Ride completed"));
    }

    @PostMapping("/rides/{id}/distance")
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
    public ResponseEntity<ApiResponse<Void>> updateVehicle(@Valid @RequestBody UpdateVehicleDetailsRequest request) {
        driverService.updateVehicleDetails(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Vehicle details updated"));
    }

    public record ManualDistanceRequest(
        @NotNull @DecimalMin("0.0") BigDecimal distanceKm
    ) {
    }
}
