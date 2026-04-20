package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.Role;

public record ChatParticipantResponse(
    Long userId,
    String fullName,
    String phoneNumber,
    Role role
) {
}
