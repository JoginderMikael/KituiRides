package com.kituirides.api.ride;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateRideRequest(
    @NotNull @Min(-90) @Max(90) Double pickupLat,
    @NotNull @Min(-180) @Max(180) Double pickupLng,
    @NotNull @Min(-90) @Max(90) Double dropoffLat,
    @NotNull @Min(-180) @Max(180) Double dropoffLng,
    @NotBlank String pickupAddress,
    @NotBlank String dropoffAddress
) {
}
