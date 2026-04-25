package com.kituirides.api.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for login.
 */
public record LoginRequest(
    @NotBlank String email,
    @NotBlank String password
) {
}
