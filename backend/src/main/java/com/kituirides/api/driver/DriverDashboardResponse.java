package com.kituirides.api.driver;

import com.kituirides.api.ride.RideResponse;
import java.math.BigDecimal;
import java.time.Instant;

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
    Double latitude,
    Double longitude,
    Instant locationUpdatedAt,
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
