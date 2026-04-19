package com.kituirides.api.auth;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.DocumentType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.driver.DocumentService;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final DocumentService documentService;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
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
        user.setRole(request.role());
        user.setProfilePhotoUrl(request.profilePhotoUrl());
        User saved = userRepository.save(user);

        if (saved.getRole() == Role.DRIVER) {
            RiderProfile profile = new RiderProfile();
            profile.setUser(saved);
            profile.setLicenseNumber(request.licenseNumber() != null ? request.licenseNumber() : "PENDING-" + saved.getId());
            profile.setIdNumber(request.idNumber());
            profile.setPassportPhotoUrl(request.profilePhotoUrl());
            profile.setVerified(false);
            profile.setAvailable(false);
            riderProfileRepository.save(profile);

            // Link documents
            if (request.idFrontUrl() != null) {
                documentService.uploadDocument(saved.getId(), DocumentType.ID_FRONT, null, request.idFrontUrl());
            }
            if (request.idBackUrl() != null) {
                documentService.uploadDocument(saved.getId(), DocumentType.ID_BACK, null, request.idBackUrl());
            }
            if (request.licenseFrontUrl() != null) {
                documentService.uploadDocument(saved.getId(), DocumentType.DRIVER_LICENSE_FRONT, null, request.licenseFrontUrl());
            }
            if (request.licenseBackUrl() != null) {
                documentService.uploadDocument(saved.getId(), DocumentType.DRIVER_LICENSE_BACK, null, request.licenseBackUrl());
            }
            if (request.profilePhotoUrl() != null) {
                documentService.uploadDocument(saved.getId(), DocumentType.PASSPORT_PHOTO, null, request.profilePhotoUrl());
            }
        }

        return generateAuthResponse(saved);
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
            );
        } catch (AuthenticationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        return generateAuthResponse(user);
    }

    private AuthResponse generateAuthResponse(User user) {
        Role role = user.getRole();
        String token = jwtService.generateToken(
            user.getEmail(),
            Map.of("userId", user.getId(), "role", role.name())
        );
        return new AuthResponse(token, user.getId(), user.getEmail(), role);
    }
}
