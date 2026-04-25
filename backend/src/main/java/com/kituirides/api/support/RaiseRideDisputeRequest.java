package com.kituirides.api.support;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for raise ride dispute.
 */
public record RaiseRideDisputeRequest(
    @NotBlank String reason
) {
}
