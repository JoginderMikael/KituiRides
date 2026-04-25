package com.kituirides.api.matching;

import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.entity.Vehicle;
import com.kituirides.api.domain.enums.VehicleType;
import java.math.BigDecimal;

/**
 * Result payload for driver match.
 */
public record DriverMatchResult(
    User driver,
    Vehicle vehicle,
    Double latitude,
    Double longitude,
    String driverName,
    String vehicleModel,
    String plateNumber,
    VehicleType vehicleType,
    int etaMinutes,
    double distanceToPickupKm,
    BigDecimal estimatedPrice
) {
}
