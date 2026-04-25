package com.kituirides.api.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for update user account.
 */
public record UpdateUserAccountRequest(
    @NotBlank(message = "First name is required") String firstName,
    @NotBlank(message = "Last name is required") String lastName,
    @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") String email,
    @NotBlank(message = "Phone number is required") String phoneNumber,
    @NotNull(message = "Account status is required") Boolean active
) {}
