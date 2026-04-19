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
    RideResponse activeTrip,
    Integer pendingOfferCount,
    String supportPhoneNumber,
    DriverVehicleSummary vehicle,
    DriverWalletSummary wallet
) {
}

record DriverVehicleSummary(
    String make,
    String model,
    String color,
    String plateNumber,
    Integer engineSize,
    Integer yearOfManufacture
) {
}

record DriverWalletSummary(
    BigDecimal balance,
    BigDecimal totalEarned,
    BigDecimal totalWithdrawn,
    BigDecimal outstandingCommission
) {
}
