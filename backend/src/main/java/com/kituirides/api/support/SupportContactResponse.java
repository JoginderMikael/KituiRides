package com.kituirides.api.support;

public record SupportContactResponse(
    String phoneNumber,
    String emailAddress,
    String helpLabel,
    String escalationContact,
    Boolean emergencyContactVisible
) {
}
