package com.kituirides.api.admin;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Document;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.AuditLogRepository;
import com.kituirides.api.repository.ConversationRepository;
import com.kituirides.api.repository.DocumentRepository;
import com.kituirides.api.repository.DriverWalletRepository;
import com.kituirides.api.repository.LocationPingRepository;
import com.kituirides.api.repository.MessageRepository;
import com.kituirides.api.repository.PaymentRepository;
import com.kituirides.api.repository.RatingRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RideOfferRepository;
import com.kituirides.api.repository.SupportTicketReplyRepository;
import com.kituirides.api.repository.SupportTicketRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.user.UserProfileResponse;
import com.kituirides.api.user.UserService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Handles admin workflows.
 */
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
    private final DocumentRepository documentRepository;
    private final DriverWalletRepository driverWalletRepository;
    private final LocationPingRepository locationPingRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final PaymentRepository paymentRepository;
    private final RideOfferRepository rideOfferRepository;
    private final RatingRepository ratingRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketReplyRepository supportTicketReplyRepository;
    private final AuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;

    public AdminDashboardResponse dashboard() {
        return new AdminDashboardResponse(
                userRepository.count(),
                rideRepository.count(),
                rideRepository.countByStatus(RideStatus.REQUESTED));
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
        return approved ? "Driver approved" : "Driver unverified and locked from offering rides";
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
    public UserProfileResponse updateUserAccount(Long userId, UpdateUserAccountRequest request) {
        User currentAdmin = currentUserService.getCurrentUser();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        String email = request.email().trim().toLowerCase();
        String phoneNumber = request.phoneNumber().trim();

        if (!user.getEmail().equalsIgnoreCase(email) && userRepository.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        if (!user.getPhoneNumber().equals(phoneNumber) && userRepository.existsByPhoneNumber(phoneNumber)) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already exists");
        }
        if (user.getId().equals(currentAdmin.getId()) && !request.active()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot suspend your own account");
        }
        if (user.getRole() == Role.ADMIN && Boolean.TRUE.equals(user.getActive()) && !request.active()) {
            long activeAdmins = userRepository.findByRole(Role.ADMIN).stream()
                    .filter(admin -> Boolean.TRUE.equals(admin.getActive()))
                    .count();
            if (activeAdmins <= 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot suspend the last active admin account");
            }
        }

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setActive(request.active());
        return userService.toResponse(userRepository.save(user));
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
        user.setProfilePhotoUrl(request.profilePhotoUrl());
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

    @Transactional
    public String deleteUser(Long userId) {
        User currentAdmin = currentUserService.getCurrentUser();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        if (user.getId().equals(currentAdmin.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }
        if (user.getRole() == Role.ADMIN && userRepository.findByRole(Role.ADMIN).size() <= 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete the last admin account");
        }

        clearDocumentApprovalReferences(user);

        List<Ride> rides = new ArrayList<>();
        rides.addAll(rideRepository.findByCustomerOrderByRequestedAtDesc(user));
        rides.addAll(rideRepository.findByRiderOrderByRequestedAtDesc(user));
        rides = uniqueById(rides, Ride::getId);
        Map<Long, SupportTicket> rideTickets = new LinkedHashMap<>();

        for (Ride ride : rides) {
            deleteRideDependencies(ride, rideTickets);
        }

        if (!rides.isEmpty()) {
            rideRepository.deleteAll(rides);
        }
        deleteSupportTickets(rideTickets.values());

        deleteCreatedTickets(user, rideTickets);
        releaseAssignedTickets(user, rideTickets);
        deleteRemainingConversations(user);
        deleteUserOwnedRecords(user);
        deleteDriverProfileData(user);
        auditLogRepository.deleteAll(auditLogRepository.findByAdmin_IdOrderByCreatedAtDesc(userId));
        userRepository.delete(user);
        return "User deleted";
    }

    private void clearDocumentApprovalReferences(User user) {
        List<Document> approvedDocuments = documentRepository.findByApprovedBy(user);
        if (approvedDocuments.isEmpty()) {
            return;
        }
        approvedDocuments.forEach(document -> document.setApprovedBy(null));
        documentRepository.saveAll(approvedDocuments);
    }

    private void deleteRideDependencies(Ride ride, Map<Long, SupportTicket> rideTickets) {
        deleteConversations(conversationRepository.findByRide(ride));
        ratingRepository.deleteAll(ratingRepository.findByRide(ride));
        rideOfferRepository.deleteAll(rideOfferRepository.findByRideOrderByOfferedAtAsc(ride));
        paymentRepository.findByRide(ride).ifPresent(paymentRepository::delete);

        if (ride.getSupportTicket() != null) {
            rideTickets.put(ride.getSupportTicket().getId(), ride.getSupportTicket());
        }
        supportTicketRepository.findByRideId(ride.getId())
                .forEach(ticket -> rideTickets.put(ticket.getId(), ticket));
    }

    private void deleteSupportTickets(Iterable<SupportTicket> tickets) {
        List<SupportTicket> ticketList = uniqueById(tickets, SupportTicket::getId);
        if (ticketList.isEmpty()) {
            return;
        }
        supportTicketReplyRepository.deleteByTicketIn(ticketList);
        supportTicketRepository.deleteAll(ticketList);
    }

    private void deleteCreatedTickets(User user, Map<Long, SupportTicket> skippedTickets) {
        List<SupportTicket> createdTickets = supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(user).stream()
                .filter(ticket -> !skippedTickets.containsKey(ticket.getId()))
                .toList();

        if (createdTickets.isEmpty()) {
            return;
        }

        for (SupportTicket ticket : createdTickets) {
            List<Ride> linkedRides = rideRepository.findBySupportTicket(ticket);
            if (!linkedRides.isEmpty()) {
                linkedRides.forEach(ride -> ride.setSupportTicket(null));
                rideRepository.saveAll(linkedRides);
            }
        }

        deleteSupportTickets(createdTickets);
    }

    private void releaseAssignedTickets(User user, Map<Long, SupportTicket> skippedTickets) {
        List<SupportTicket> assignedTickets = supportTicketRepository.findByAssignedTo(user).stream()
                .filter(ticket -> !skippedTickets.containsKey(ticket.getId()))
                .toList();
        if (assignedTickets.isEmpty()) {
            return;
        }
        assignedTickets.forEach(ticket -> ticket.setAssignedTo(null));
        supportTicketRepository.saveAll(assignedTickets);
    }

    private void deleteRemainingConversations(User user) {
        deleteConversations(
                conversationRepository.findByParticipant1OrParticipant2OrSupportAgent(user, user, user));
    }

    private void deleteConversations(List<Conversation> conversations) {
        List<Conversation> uniqueConversations = uniqueById(conversations, Conversation::getId);
        if (uniqueConversations.isEmpty()) {
            return;
        }
        messageRepository.deleteByConversationIn(uniqueConversations);
        conversationRepository.deleteAll(uniqueConversations);
    }

    private void deleteUserOwnedRecords(User user) {
        documentRepository.deleteAll(documentRepository.findByDriver(user));
        supportTicketReplyRepository.deleteAll(supportTicketReplyRepository.findByAuthor(user));
        rideOfferRepository.deleteAll(rideOfferRepository.findByDriver(user));
        ratingRepository.deleteAll(ratingRepository.findByCustomerOrRider(user, user));
        locationPingRepository.deleteAll(locationPingRepository.findByUser(user));
    }

    private void deleteDriverProfileData(User user) {
        RiderProfile profile = riderProfileRepository.findByUser(user).orElse(null);
        if (profile == null) {
            return;
        }
        driverWalletRepository.findByDriver(profile).ifPresent(driverWalletRepository::delete);
        vehicleRepository.findByRiderProfile(profile).ifPresent(vehicleRepository::delete);
        riderProfileRepository.delete(profile);
    }

    private <T> List<T> uniqueById(Iterable<T> entities, Function<T, Long> idExtractor) {
        Map<Long, T> unique = new LinkedHashMap<>();
        for (T entity : entities) {
            Long id = entity != null ? idExtractor.apply(entity) : null;
            if (id != null) {
                unique.put(id, entity);
            }
        }
        return new ArrayList<>(unique.values());
    }
}

/**
 * Request payload for create support agent.
 */
record CreateSupportAgentRequest(
        @NotBlank(message = "First name is required") String firstName,
        @NotBlank(message = "Last name is required") String lastName,
        @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
        @NotBlank(message = "Phone number is required") String phoneNumber,
        @NotBlank(message = "Password is required") @Size(min = 8, message = "Support agent password must be at least 8 characters") String password) {
}

/**
 * Request payload for update driver details.
 */
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
        @NotNull(message = "Engine size is required") @Min(value = 1, message = "Engine size must be greater than 0") Integer engineSize,
        @NotNull(message = "Year of manufacture is required") @Min(value = 1900, message = "Year of manufacture is invalid") Integer yearOfManufacture,
        @NotNull(message = "Vehicle type is required") com.kituirides.api.domain.enums.VehicleType vehicleType,
        String profilePhotoUrl,
        String carFrontUrl,
        String carRearUrl,
        String carInteriorUrl,
        String insurancePhotoUrl,
        String chassisPhotoUrl) {
}
