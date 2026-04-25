package com.kituirides.api.user;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for update profile.
 */
public record UpdateProfileRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank String phoneNumber
) {
}
