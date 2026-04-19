package com.kituirides.api.user;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Document;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.DocumentRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.security.CurrentUserService;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final VehicleRepository vehicleRepository;
    private final DocumentRepository documentRepository;
    private final CurrentUserService currentUserService;

    public UserProfileResponse me() {
        return toResponse(currentUserService.getCurrentUser());
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UpdateProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        if (!user.getPhoneNumber().equals(request.phoneNumber()) &&
            userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already exists");
        }
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhoneNumber(request.phoneNumber());
        return toResponse(userRepository.save(user));
    }

    public List<UserProfileResponse> listAll() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    public UserProfileResponse toResponse(User user) {
        String idNumber = null;
        String licenseNumber = null;
        Boolean isOwner = null;
        String carMake = null;
        String carModel = null;
        String plateNumber = null;
        Integer engineSize = null;
        Integer yearOfManufacture = null;
        com.kituirides.api.domain.enums.VehicleType vehicleType = null;
        Boolean verified = null;
        Boolean available = null;
        String idFrontUrl = null;
        String idBackUrl = null;
        String licenseFrontUrl = null;
        String licenseBackUrl = null;
        String carFrontUrl = null;
        String carRearUrl = null;
        String carInteriorUrl = null;
        String insurancePhotoUrl = null;
        String chassisPhotoUrl = null;

        if (user.getRole() == Role.DRIVER) {
            var profile = riderProfileRepository.findByUser(user).orElse(null);
            if (profile != null) {
                idNumber = profile.getIdNumber();
                licenseNumber = profile.getLicenseNumber();
                isOwner = profile.getIsOwner();
                verified = profile.getVerified();
                available = profile.getAvailable();

                var vehicle = vehicleRepository.findByRiderProfile(profile).orElse(null);
                if (vehicle != null) {
                    carMake = vehicle.getMake();
                    carModel = vehicle.getModel();
                    plateNumber = vehicle.getPlateNumber();
                    engineSize = vehicle.getEngineSize();
                    yearOfManufacture = vehicle.getYearOfManufacture();
                    vehicleType = vehicle.getVehicleType();
                    carFrontUrl = vehicle.getFrontPhotoUrl();
                    carRearUrl = vehicle.getRearPhotoUrl();
                    carInteriorUrl = vehicle.getInteriorPhotoUrl();
                    insurancePhotoUrl = vehicle.getInsurancePhotoUrl();
                    chassisPhotoUrl = vehicle.getChassisPhotoUrl();
                }

                // Documents
                List<Document> docs = documentRepository.findByDriver_IdOrderByUploadDateDesc(user.getId());
                idFrontUrl = getDocUrl(docs, DocumentType.ID_FRONT);
                idBackUrl = getDocUrl(docs, DocumentType.ID_BACK);
                licenseFrontUrl = getDocUrl(docs, DocumentType.DRIVER_LICENSE_FRONT);
                licenseBackUrl = getDocUrl(docs, DocumentType.DRIVER_LICENSE_BACK);
            }
        }

        return new UserProfileResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getPhoneNumber(),
            user.getRole(),
            user.getProfilePhotoUrl(),
            idNumber,
            licenseNumber,
            isOwner,
            carMake,
            carModel,
            plateNumber,
            engineSize,
            yearOfManufacture,
            vehicleType,
            verified,
            available,
            idFrontUrl,
            idBackUrl,
            licenseFrontUrl,
            licenseBackUrl,
            carFrontUrl,
            carRearUrl,
            carInteriorUrl,
            insurancePhotoUrl,
            chassisPhotoUrl
        );
    }

    private String getDocUrl(List<Document> docs, DocumentType type) {
        return docs.stream()
            .filter(d -> d.getDocumentType() == type)
            .map(Document::getFileUrl)
            .findFirst()
            .orElse(null);
    }
}
