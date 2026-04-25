package com.kituirides.api.location;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.domain.enums.VehicleType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Exposes driver location updates and nearby driver search endpoints.
 */
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
@Tag(name = "Locations", description = "Realtime location update and driver discovery endpoints")
@SecurityRequirement(name = "bearerAuth")
public class LocationController {

    private final LocationService locationService;

    @PostMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(
        summary = "Update my location",
        description = "Stores the authenticated driver's latest location and availability context."
    )
    public ResponseEntity<ApiResponse<Void>> updateMyLocation(@Valid @RequestBody LocationUpdateRequest request) {
        locationService.updateMyLocation(request);
        return ResponseEntity.ok(ApiResponse.ok(null, "Location updated"));
    }

    @GetMapping("/nearby-drivers")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'ADMIN')")
    @Operation(
        summary = "Search nearby drivers",
        description = "Returns nearby drivers for the supplied trip route and vehicle type."
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
}
