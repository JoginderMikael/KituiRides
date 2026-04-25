package com.kituirides.api.auth;

import com.kituirides.api.domain.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for register.
 */
public record RegisterRequest(
    @NotBlank(message = "First name is required") String firstName,
    @NotBlank(message = "Last name is required") String lastName,
    @NotBlank(message = "Email is required")
    @Email(message = "Enter a valid email address")
    String email,
    @NotBlank(message = "Phone number is required") String phoneNumber,
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters long")
    String password,
    @NotNull(message = "Account type is required") Role role,
    String idNumber,
    String licenseNumber,
    String profilePhotoUrl,
    String idFrontUrl,
    String idBackUrl,
    String licenseFrontUrl,
    String licenseBackUrl
) {
}
