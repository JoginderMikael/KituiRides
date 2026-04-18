package com.kituirides.api.admin;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.user.UserProfileResponse;
import com.kituirides.api.user.UserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RideRepository rideRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final UserService userService;
    private final RideService rideService;

    public AdminDashboardResponse dashboard() {
        return new AdminDashboardResponse(
            userRepository.count(),
            rideRepository.count(),
            rideRepository.countByStatus(RideStatus.REQUESTED)
        );
    }

    public List<UserProfileResponse> allUsers() {
        return userService.listAll();
    }

    public List<RideResponse> allRides() {
        return rideService.listAll();
    }

    @Transactional
    public String approveDriver(Long driverUserId, boolean approved) {
        RiderProfile profile = riderProfileRepository.findByUserId(driverUserId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Driver profile not found"));
        profile.setVerified(approved);
        if (!approved) {
            profile.setAvailable(false);
        }
        riderProfileRepository.save(profile);
        return approved ? "Driver approved" : "Driver rejected";
    }
}
