package com.kituirides.api.support;

import jakarta.validation.constraints.NotBlank;

public record RaiseRideDisputeRequest(
    @NotBlank String reason
) {
}
