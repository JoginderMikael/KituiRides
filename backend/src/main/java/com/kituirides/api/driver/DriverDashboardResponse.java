package com.kituirides.api.driver;

import com.kituirides.api.ride.RideResponse;
import java.math.BigDecimal;

public record DriverDashboardResponse(
    Long userId,
    String fullName,
    String licenseNumber,
    Boolean verified,
    Boolean online,
    BigDecimal totalEarnings,
    RideResponse activeTrip
) {
}
