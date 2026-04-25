package com.kituirides.api.ride;

import com.kituirides.api.domain.enums.DistanceSource;
import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response payload for ride.
 */
public record RideResponse(
    Long id,
    Long customerId,
    String customerName,
    String customerPhone,
    Long riderId,
    String riderName,
    String riderPhone,
    Double riderLat,
    Double riderLng,
    String pickupAddress,
    String dropoffAddress,
    Double pickupLat,
    Double pickupLng,
    Double dropoffLat,
    Double dropoffLng,
    BigDecimal estimatedFare,
    BigDecimal finalFare,
    Double surgeMultiplier,
    Integer etaMinutes,
    RideStatus status,
    Instant requestedAt,
    Instant acceptedAt,
    Instant arrivedAt,
    Instant startedAt,
    Instant paymentPendingAt,
    Instant paymentCompletedAt,
    Instant cancelledAt,
    Instant disputedAt,
    Instant completedAt,
    VehicleType vehicleType,
    PaymentType paymentType,
    PaymentStatus paymentStatus,
    BigDecimal estimatedDistanceKm,
    BigDecimal chargeableDistanceKm,
    DistanceSource distanceSource,
    Boolean manualDistanceRequired,
    Boolean paymentApproved,
    Long supportTicketId,
    String disputeReason
) {
}
