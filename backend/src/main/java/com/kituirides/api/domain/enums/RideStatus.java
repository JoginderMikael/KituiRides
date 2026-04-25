package com.kituirides.api.domain.enums;

/**
 * Enumerates ride status values.
 */
public enum RideStatus {
    REQUESTED,
    DRIVER_ASSIGNED,
    DRIVER_ACCEPTED,
    DRIVER_REJECTED,
    DRIVER_ARRIVED,
    TRIP_STARTED,
    TRIP_CANCELLED,
    PAYMENT_PENDING,
    PAYMENT_COMPLETED,
    TRIP_COMPLETED,
    DISPUTED
}
