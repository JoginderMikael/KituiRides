package com.kituirides.api.admin;

import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.user.UserProfileResponse;
import com.kituirides.api.user.UserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RideRepository rideRepository;
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
}
