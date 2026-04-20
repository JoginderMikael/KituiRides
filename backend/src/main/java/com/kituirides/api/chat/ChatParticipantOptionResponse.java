package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.Role;

public record ChatParticipantOptionResponse(
    Long userId,
    String fullName,
    String phoneNumber,
    Role role
) {
}
