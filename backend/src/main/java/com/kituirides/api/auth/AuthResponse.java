package com.kituirides.api.auth;

import com.kituirides.api.domain.enums.Role;

public record AuthResponse(
    String token,
    Long userId,
    String email,
    Role role
) {
}
