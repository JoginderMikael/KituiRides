package com.kituirides.api.ride;

import com.kituirides.api.common.ApiResponse;
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
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public ResponseEntity<ApiResponse<RideResponse>> createRide(@Valid @RequestBody CreateRideRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.createRide(request), "Ride requested"));
    }

    @PostMapping("/{rideId}/accept")
    @PreAuthorize("hasAnyRole('RIDER', 'ADMIN')")
    public ResponseEntity<ApiResponse<RideResponse>> acceptRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.acceptRide(rideId), "Ride accepted"));
    }

    @PostMapping("/{rideId}/start")
    @PreAuthorize("hasAnyRole('RIDER', 'ADMIN')")
    public ResponseEntity<ApiResponse<RideResponse>> startRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.startRide(rideId), "Ride started"));
    }

    @PostMapping("/{rideId}/complete")
    @PreAuthorize("hasAnyRole('RIDER', 'ADMIN')")
    public ResponseEntity<ApiResponse<RideResponse>> completeRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.completeRide(rideId), "Ride completed"));
    }

    @GetMapping("/me/customer")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<RideResponse>>> customerRides() {
        return ResponseEntity.ok(ApiResponse.ok(rideService.myCustomerRides()));
    }

    @GetMapping("/me/rider")
    @PreAuthorize("hasAnyRole('RIDER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<RideResponse>>> riderRides() {
        return ResponseEntity.ok(ApiResponse.ok(rideService.myRiderRides()));
    }
}
