package com.kituirides.api.driver;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.DriverWallet;
import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.payment.DriverWalletService;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.ride.RideOfferResponse;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.support.SupportService;
import java.math.BigDecimal;
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
    private final DocumentService documentService;
    private final DriverWalletService driverWalletService;
    private final AdminSettingsService adminSettingsService;
    private final LocationPingRepository locationPingRepository;
    private final SupportService supportService;

    public DriverDashboardResponse dashboard() {
        var current = currentUserService.getCurrentUser();
        RiderProfile profile = riderProfileRepository.findByUser(current)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver profile not found"));
        Vehicle vehicle = vehicleRepository.findByRiderProfile(profile).orElse(null);
        DriverWallet wallet = driverWalletService.getWalletDetails(current);
        LocationPing latestLocation = locationPingRepository.findTopByUserOrderByTimestampDesc(current).orElse(null);

        RideResponse activeTrip = rideService.myDriverRides().stream()
            .filter(ride -> ride.status() == RideStatus.DRIVER_ACCEPTED
                || ride.status() == RideStatus.DRIVER_ARRIVED
                || ride.status() == RideStatus.TRIP_STARTED
                || ride.status() == RideStatus.PAYMENT_PENDING
                || ride.status() == RideStatus.PAYMENT_COMPLETED
                || ride.status() == RideStatus.DISPUTED)
            .findFirst()
            .orElse(null);

        DriverVehicleSummary vehicleSummary = vehicle == null ? null : new DriverVehicleSummary(
            vehicle.getMake(),
            vehicle.getModel(),
            vehicle.getColor(),
            vehicle.getPlateNumber(),
            vehicle.getEngineSize(),
            vehicle.getYearOfManufacture()
        );
        DriverWalletSummary walletSummary = new DriverWalletSummary(
            wallet.getBalance(),
            wallet.getTotalEarned(),
            wallet.getTotalWithdrawn(),
            wallet.getOutstandingCommission()
        );

        return new DriverDashboardResponse(
            current.getId(),
            current.getFirstName() + " " + current.getLastName(),
            profile.getLicenseNumber(),
            profile.getVerified(),
            profile.getAvailable(),
            wallet.getTotalEarned(),
            activeTrip,
            rideService.myDriverOffers().size(),
            adminSettingsService.getSupportSettings().supportPhoneNumber(),
            latestLocation != null ? latestLocation.getLatitude() : null,
            latestLocation != null ? latestLocation.getLongitude() : null,
            latestLocation != null ? latestLocation.getTimestamp() : null,
            vehicleSummary,
            walletSummary
        );
    }

    @Transactional
    public DriverDashboardResponse updateStatus(UpdateDriverStatusRequest request) {
        var current = currentUserService.getCurrentUser();
        RiderProfile profile = riderProfileRepository.findByUser(current)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver profile not found"));
        if (Boolean.TRUE.equals(request.online()) && !Boolean.TRUE.equals(profile.getVerified())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Driver must be approved before going online");
        }
        profile.setAvailable(request.online());
        riderProfileRepository.save(profile);
        return dashboard();
    }

    public List<RideResponse> rides() {
        return rideService.myDriverRides();
    }

    public List<RideOfferResponse> offers() {
        return rideService.myDriverOffers();
    }

    public RideResponse rideById(Long rideId) {
        return rideService.driverRideById(rideId);
    }

    public RideResponse acceptRide(Long rideId) {
        return rideService.acceptRide(rideId);
    }

    public RideResponse rejectRide(Long rideId) {
        return rideService.rejectRide(rideId);
    }

    public RideResponse markArrival(Long rideId) {
        return rideService.markArrival(rideId);
    }

    public RideResponse startRide(Long rideId) {
        return rideService.startRide(rideId);
    }

    public RideResponse completeRide(Long rideId) {
        return rideService.completeRide(rideId);
    }

    @Transactional
    public RideResponse cancelRide(Long rideId, String reason) {
        SupportTicket reviewTicket = supportService.createDriverCancellationReview(rideId, reason);
        return rideService.cancelRideAsDriver(rideId, reviewTicket, reason);
    }

    public RideResponse submitManualDistance(Long rideId, BigDecimal distanceKm) {
        return rideService.submitManualDistance(rideId, distanceKm);
    }

    @Transactional
    public void updateVehicleDetails(UpdateVehicleDetailsRequest request) {
        var current = currentUserService.getCurrentUser();
        RiderProfile profile = riderProfileRepository.findByUser(current)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver profile not found"));

        Vehicle existingVehicle = vehicleRepository.findByRiderProfile(profile).orElse(null);
        if (existingVehicle != null && existingVehicle.getPlateNumber() != null) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                "Driver vehicle details are locked after submission. Ask support to request admin edits."
            );
        }

        Vehicle vehicle = existingVehicle != null ? existingVehicle : new Vehicle();
        vehicle.setRiderProfile(profile);
        vehicle.setMake(request.make());
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
) {
}
