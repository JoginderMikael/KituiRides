package com.kituirides.api.driver;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.security.CurrentUserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DriverService {

    private final CurrentUserService currentUserService;
    private final RiderProfileRepository riderProfileRepository;
    private final RideService rideService;
    private final PaymentRepository paymentRepository;

    public DriverDashboardResponse dashboard() {
        var current = currentUserService.getCurrentUser();
        RiderProfile profile = riderProfileRepository.findByUser(current)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver profile not found"));
        RideResponse activeTrip = rideService.myDriverRides().stream()
            .filter(ride -> ride.status() == RideStatus.ACCEPTED || ride.status() == RideStatus.STARTED)
            .findFirst()
            .orElse(null);

        return new DriverDashboardResponse(
            current.getId(),
            current.getFirstName() + " " + current.getLastName(),
            profile.getLicenseNumber(),
            profile.getVerified(),
            profile.getAvailable(),
            paymentRepository.totalSuccessfulEarningsByRider(current.getId()),
            activeTrip
        );
    }

    @Transactional
    public DriverDashboardResponse updateStatus(UpdateDriverStatusRequest request) {
        var current = currentUserService.getCurrentUser();
        RiderProfile profile = riderProfileRepository.findByUser(current)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver profile not found"));
        profile.setAvailable(request.online());
        riderProfileRepository.save(profile);
        return dashboard();
    }

    public List<RideResponse> rides() {
        return rideService.myDriverRides();
    }

    public RideResponse acceptRide(Long rideId) {
        return rideService.acceptRide(rideId);
    }

    public RideResponse completeRide(Long rideId) {
        return rideService.completeRide(rideId);
    }
}
