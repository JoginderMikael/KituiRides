package com.kituirides.api.driver;

import com.kituirides.api.ride.RideResponse;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response payload for driver dashboard.
 */
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

/**
 * Immutable data type for driver vehicle summary.
 */
record DriverVehicleSummary(
    String make,
    String model,
    String color,
    String plateNumber,
    Integer engineSize,
    Integer yearOfManufacture
) {
}

/**
 * Immutable data type for driver wallet summary.
 */
record DriverWalletSummary(
    BigDecimal balance,
    BigDecimal totalEarned,
    BigDecimal totalWithdrawn,
    BigDecimal outstandingCommission
) {
}
