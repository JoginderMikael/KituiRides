package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.Role;

/**
 * Response payload for chat participant option.
 */
public record ChatParticipantOptionResponse(
    Long userId,
    String fullName,
    String phoneNumber,
    Role role
) {
}
