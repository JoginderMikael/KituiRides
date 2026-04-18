package com.kituirides.api.auth;

import com.kituirides.api.domain.enums.Role;
import java.util.Set;

public record AuthResponse(
    String token,
    Long userId,
    String email,
    Set<Role> roles
) {
}
