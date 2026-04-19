package com.kituirides.api.location;

import com.kituirides.api.domain.enums.VehicleType;
import java.math.BigDecimal;

public record NearbyDriverResponse(
    Long riderId,
    Double latitude,
    Double longitude,
    String vehicleModel,
    String plateNumber,
    String driverName,
    VehicleType vehicleType,
    Integer etaMinutes,
    BigDecimal distanceToPickupKm,
    BigDecimal estimatedPrice
) {
}
