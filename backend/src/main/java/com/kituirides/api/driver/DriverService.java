package com.kituirides.api.driver;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
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
    private final VehicleRepository vehicleRepository;
    private final RideService rideService;
    private final PaymentRepository paymentRepository;
    private final DocumentService documentService;

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

    public RideResponse startRide(Long rideId) {
        return rideService.startRide(rideId);
    }

    public RideResponse completeRide(Long rideId) {
        return rideService.completeRide(rideId);
    }

    @Transactional
    public void updateVehicleDetails(UpdateVehicleDetailsRequest request) {
        var current = currentUserService.getCurrentUser();
        RiderProfile profile = riderProfileRepository.findByUser(current)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver profile not found"));
        
        Vehicle vehicle = vehicleRepository.findByRiderProfile(profile)
            .orElse(new Vehicle());
        
        vehicle.setRiderProfile(profile);
        vehicle.setMake(request.make()); // Could split model and make but standard is model
        vehicle.setModel(request.model());
        vehicle.setPlateNumber(request.plateNumber());
        vehicle.setEngineSize(request.engineSize());
        vehicle.setYearOfManufacture(request.yearOfManufacture());
        vehicle.setVehicleType(request.vehicleType());
        vehicle.setColor(request.color());
        vehicle.setFrontPhotoUrl(request.frontPhotoUrl());
        vehicle.setRearPhotoUrl(request.rearPhotoUrl());
        vehicle.setInteriorPhotoUrl(request.interiorPhotoUrl());
        vehicle.setInsurancePhotoUrl(request.insurancePhotoUrl());
        vehicle.setChassisPhotoUrl(request.chassisPhotoUrl());
        
        vehicleRepository.save(vehicle);
        
        // Link car documents
        if (request.frontPhotoUrl() != null) {
            documentService.uploadDocument(current.getId(), DocumentType.CAR_FRONT, null, request.frontPhotoUrl());
        }
        if (request.rearPhotoUrl() != null) {
            documentService.uploadDocument(current.getId(), DocumentType.CAR_BACK, null, request.rearPhotoUrl());
        }
        if (request.interiorPhotoUrl() != null) {
            documentService.uploadDocument(current.getId(), DocumentType.CAR_INTERIOR, null, request.interiorPhotoUrl());
        }
        if (request.insurancePhotoUrl() != null) {
            documentService.uploadDocument(current.getId(), DocumentType.INSURANCE_STICKER, null, request.insurancePhotoUrl());
        }
        if (request.chassisPhotoUrl() != null) {
            documentService.uploadDocument(current.getId(), DocumentType.CHASSIS_NUMBER, null, request.chassisPhotoUrl());
        }

        profile.setIsOwner(request.isOwner());
        riderProfileRepository.save(profile);
    }
}

record UpdateVehicleDetailsRequest(
    String make,
    String model,
    String color,
    String plateNumber,
    Integer engineSize,
    Integer yearOfManufacture,
    Boolean isOwner,
    VehicleType vehicleType,
    String frontPhotoUrl,
    String rearPhotoUrl,
    String interiorPhotoUrl,
    String insurancePhotoUrl,
    String chassisPhotoUrl
) {}
