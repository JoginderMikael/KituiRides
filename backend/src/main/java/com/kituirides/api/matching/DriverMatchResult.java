package com.kituirides.api.matching;

import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.entity.Vehicle;
import java.math.BigDecimal;

public record DriverMatchResult(
    User driver,
    Vehicle vehicle,
    Double latitude,
    Double longitude,
    int etaMinutes,
    double distanceToPickupKm,
    BigDecimal estimatedPrice
) {
}
