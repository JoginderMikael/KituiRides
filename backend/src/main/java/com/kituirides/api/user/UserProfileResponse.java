package com.kituirides.api.user;

import com.kituirides.api.domain.enums.Role;

public record UserProfileResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phoneNumber,
    Role role,
    String profilePhotoUrl
) {
}
