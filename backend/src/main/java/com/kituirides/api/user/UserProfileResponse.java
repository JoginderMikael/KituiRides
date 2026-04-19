package com.kituirides.api.user;

import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.VehicleType;

public record UserProfileResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phoneNumber,
    Role role,
    String profilePhotoUrl,
    // Driver specific
    String idNumber,
    String licenseNumber,
    Boolean isOwner,
    String carMake,
    String carModel,
    String plateNumber,
    Integer engineSize,
    Integer yearOfManufacture,
    VehicleType vehicleType,
    Boolean verified,
    Boolean available,
    String idFrontUrl,
    String idBackUrl,
    String licenseFrontUrl,
    String licenseBackUrl,
    String carFrontUrl,
    String carRearUrl,
    String carInteriorUrl,
    String insurancePhotoUrl,
    String chassisPhotoUrl
) {
}
