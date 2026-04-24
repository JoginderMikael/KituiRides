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

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final RideService rideService;
    private final LocationService locationService;
    private final SupportService supportService;

    @PostMapping("/rides")
    public ResponseEntity<ApiResponse<RideResponse>> requestRide(@Valid @RequestBody CreateRideRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.createRide(request), "Ride requested"));
    }

    @GetMapping("/rides")
    public ResponseEntity<ApiResponse<List<RideResponse>>> myRides() {
        return ResponseEntity.ok(ApiResponse.ok(rideService.myCustomerRides()));
    }

    @GetMapping("/rides/estimate")
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
    public ResponseEntity<ApiResponse<RideResponse>> rideById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.customerRideById(id)));
    }

    @GetMapping("/nearby-drivers")
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
    public ResponseEntity<ApiResponse<RideResponse>> cancelRide(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(rideService.cancelRide(id), "Ride cancelled"));
    }

    @PostMapping("/rides/{id}/dispute")
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
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(@Valid @RequestBody CreateTicketRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.createTicket(request), "Ticket created"));
    }

    @GetMapping("/tickets")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> myTickets() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.myTickets()));
    }
}
