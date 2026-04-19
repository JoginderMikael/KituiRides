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
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

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

        String email = request.email().trim().toLowerCase();
        String phoneNumber = request.phoneNumber().trim();

        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        if (!user.getPhoneNumber().equals(phoneNumber) && userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already exists");
        }
        
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        userRepository.save(user);
        
        profile.setIdNumber(request.idNumber().trim());
        profile.setLicenseNumber(request.licenseNumber().trim());
        profile.setIsOwner(request.isOwner());
        profile.setPassportPhotoUrl(request.profilePhotoUrl());
        riderProfileRepository.save(profile);

        // Update vehicle if present
        vehicleRepository.findByRiderProfile(profile).ifPresent(vehicle -> {
            vehicle.setMake(request.carMake().trim());
            vehicle.setModel(request.carModel().trim());
            vehicle.setPlateNumber(request.plateNumber().trim());
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
        String email = request.email().trim().toLowerCase();
        String phoneNumber = request.phoneNumber().trim();

        if (userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        if (userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already exists");
        }

        User user = new User();
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(com.kituirides.api.domain.enums.Role.SUPPORT_AGENT);
        user.setActive(true);
        user.setCreatedAt(Instant.now());
        User saved = userRepository.save(user);
        return userService.toResponse(saved);
    }
}

record CreateSupportAgentRequest(
    @NotBlank(message = "First name is required") String firstName,
    @NotBlank(message = "Last name is required") String lastName,
    @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
    @NotBlank(message = "Phone number is required") String phoneNumber,
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Support agent password must be at least 8 characters")
    String password
) {}

record UpdateDriverDetailsRequest(
    @NotBlank(message = "First name is required") String firstName,
    @NotBlank(message = "Last name is required") String lastName,
    @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
    @NotBlank(message = "Phone number is required") String phoneNumber,
    @NotBlank(message = "ID number is required") String idNumber,
    @NotBlank(message = "License number is required") String licenseNumber,
    @NotNull(message = "Ownership is required") Boolean isOwner,
    @NotBlank(message = "Vehicle make is required") String carMake,
    @NotBlank(message = "Vehicle model is required") String carModel,
    @NotBlank(message = "Plate number is required") String plateNumber,
    @NotNull(message = "Engine size is required")
    @Min(value = 1, message = "Engine size must be greater than 0")
    Integer engineSize,
    @NotNull(message = "Year of manufacture is required")
    @Min(value = 1900, message = "Year of manufacture is invalid")
    Integer yearOfManufacture,
    @NotNull(message = "Vehicle type is required")
    com.kituirides.api.domain.enums.VehicleType vehicleType,
    String profilePhotoUrl,
    String carFrontUrl,
    String carRearUrl,
    String carInteriorUrl,
    String insurancePhotoUrl,
    String chassisPhotoUrl
) {}
