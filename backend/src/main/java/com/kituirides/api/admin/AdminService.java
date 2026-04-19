package com.kituirides.api.admin;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.repository.VehicleRepository;
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
    private final VehicleRepository vehicleRepository;
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

    @Transactional
    public String upgradeToAdmin(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(com.kituirides.api.domain.enums.Role.ADMIN);
        userRepository.save(user);
        return "User upgraded to admin";
    }

    @Transactional
    public String updateDriverDetails(Long driverUserId, UpdateDriverDetailsRequest request) {
        User user = userRepository.findById(driverUserId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        RiderProfile profile = riderProfileRepository.findByUserId(driverUserId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Driver profile not found"));
        
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPhoneNumber(request.phoneNumber());
        userRepository.save(user);
        
        profile.setIdNumber(request.idNumber());
        profile.setLicenseNumber(request.licenseNumber());
        profile.setIsOwner(request.isOwner());
        profile.setPassportPhotoUrl(request.profilePhotoUrl());
        riderProfileRepository.save(profile);

        // Update vehicle if present
        vehicleRepository.findByRiderProfile(profile).ifPresent(vehicle -> {
            vehicle.setMake(request.carMake());
            vehicle.setModel(request.carModel());
            vehicle.setPlateNumber(request.plateNumber());
            vehicle.setEngineSize(request.engineSize());
            vehicle.setYearOfManufacture(request.yearOfManufacture());
            vehicle.setVehicleType(request.vehicleType());
            vehicle.setFrontPhotoUrl(request.carFrontUrl());
            vehicle.setRearPhotoUrl(request.carRearUrl());
            vehicle.setInteriorPhotoUrl(request.carInteriorUrl());
            vehicle.setInsurancePhotoUrl(request.insurancePhotoUrl());
            vehicle.setChassisPhotoUrl(request.chassisPhotoUrl());
            vehicleRepository.save(vehicle);
        });

        return "Driver details updated";
    }

    @Transactional
    public UserProfileResponse createSupportAgent(CreateSupportAgentRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPhoneNumber(request.phoneNumber());
        // Default password for support agents, they should change it
        user.setPasswordHash(new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder().encode("support123"));
        user.setRole(com.kituirides.api.domain.enums.Role.SUPPORT_AGENT);
        User saved = userRepository.save(user);
        return userService.toResponse(saved);
    }
}

record CreateSupportAgentRequest(
    String firstName,
    String lastName,
    String email,
    String phoneNumber
) {}

record UpdateDriverDetailsRequest(
    String firstName,
    String lastName,
    String email,
    String phoneNumber,
    String idNumber,
    String licenseNumber,
    Boolean isOwner,
    String carMake,
    String carModel,
    String plateNumber,
    Integer engineSize,
    Integer yearOfManufacture,
    com.kituirides.api.domain.enums.VehicleType vehicleType,
    String profilePhotoUrl,
    String carFrontUrl,
    String carRearUrl,
    String carInteriorUrl,
    String insurancePhotoUrl,
    String chassisPhotoUrl
) {}
