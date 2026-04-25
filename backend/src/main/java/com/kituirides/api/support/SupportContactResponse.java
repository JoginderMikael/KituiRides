package com.kituirides.api.support;

/**
 * Response payload for support contact.
 */
public record SupportContactResponse(
    String phoneNumber,
    String emailAddress,
    String helpLabel,
    String escalationContact,
    Boolean emergencyContactVisible
) {
}
