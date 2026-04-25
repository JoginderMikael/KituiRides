package com.kituirides.api.chat;

import com.kituirides.api.domain.enums.Role;

/**
 * Response payload for chat participant.
 */
public record ChatParticipantResponse(
    Long userId,
    String fullName,
    String phoneNumber,
    Role role
) {
}
