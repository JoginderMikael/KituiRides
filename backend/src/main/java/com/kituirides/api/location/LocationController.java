package com.kituirides.api.location;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.domain.enums.VehicleType;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @PostMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ApiResponse<Void>> updateMyLocation(@Valid @RequestBody LocationUpdateRequest request) {
        locationService.updateMyLocation(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Location updated"));
    }

    @GetMapping("/nearby-drivers")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
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
}
