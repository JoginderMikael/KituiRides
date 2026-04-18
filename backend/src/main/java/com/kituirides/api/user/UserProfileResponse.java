package com.kituirides.api.user;

import com.kituirides.api.domain.enums.Role;
import java.util.Set;

public record UserProfileResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phoneNumber,
    Set<Role> roles
) {
}
