package com.kituirides.api.auth;

import com.kituirides.api.domain.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Set;

public record RegisterRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank @Email String email,
    @NotBlank String phoneNumber,
    @NotBlank String password,
    @NotNull Set<Role> roles
) {
}
