package com.kituirides.api.driver;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideResponse;
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

    @PostMapping("/rides/{id}/accept")
    public ResponseEntity<ApiResponse<RideResponse>> acceptRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.acceptRide(id), "Ride accepted"));
    }

    @PostMapping("/rides/{id}/complete")
    public ResponseEntity<ApiResponse<RideResponse>> completeRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(driverService.completeRide(id), "Ride completed"));
    }
}
