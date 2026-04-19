package com.kituirides.api.auth;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RiderProfileRepository riderProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already exists");
        }
        if (userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already exists");
        }
        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email().toLowerCase());
        user.setPhoneNumber(request.phoneNumber());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        User saved = userRepository.save(user);

        if (saved.getRole() == Role.DRIVER) {
            RiderProfile profile = new RiderProfile();
            profile.setUser(saved);
            profile.setLicenseNumber(request.licenseNumber() != null ? request.licenseNumber() : "PENDING-" + saved.getId());
            profile.setIdNumber(request.idNumber());
            profile.setVerified(false);
            profile.setAvailable(false);
            riderProfileRepository.save(profile);
        }

        return generateAuthResponse(saved);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password())
        );
        User user = userRepository.findByEmail(request.email().toLowerCase())
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
