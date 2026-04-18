package com.kituirides.api.user;

import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank String phoneNumber
) {
}
