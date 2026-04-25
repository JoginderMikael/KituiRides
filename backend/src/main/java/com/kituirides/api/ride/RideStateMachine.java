package com.kituirides.api.ride;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.enums.RideStatus;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * Coordinates ride lifecycle state transitions.
 */
@Component
public class RideStateMachine {

    private final Map<RideStatus, Set<RideStatus>> transitions = new EnumMap<>(RideStatus.class);

    public RideStateMachine() {
        transitions.put(RideStatus.REQUESTED, EnumSet.of(RideStatus.DRIVER_ASSIGNED, RideStatus.TRIP_CANCELLED));
        transitions.put(RideStatus.DRIVER_ASSIGNED, EnumSet.of(RideStatus.DRIVER_ACCEPTED, RideStatus.DRIVER_REJECTED, RideStatus.TRIP_CANCELLED));
        transitions.put(RideStatus.DRIVER_ACCEPTED, EnumSet.of(RideStatus.DRIVER_ARRIVED, RideStatus.TRIP_CANCELLED, RideStatus.DISPUTED));
        transitions.put(RideStatus.DRIVER_REJECTED, EnumSet.noneOf(RideStatus.class));
        transitions.put(RideStatus.DRIVER_ARRIVED, EnumSet.of(RideStatus.TRIP_STARTED, RideStatus.TRIP_CANCELLED, RideStatus.DISPUTED));
        transitions.put(RideStatus.TRIP_STARTED, EnumSet.of(RideStatus.PAYMENT_PENDING, RideStatus.TRIP_CANCELLED, RideStatus.DISPUTED));
        transitions.put(RideStatus.TRIP_CANCELLED, EnumSet.of(RideStatus.PAYMENT_PENDING, RideStatus.PAYMENT_COMPLETED, RideStatus.DISPUTED));
        transitions.put(RideStatus.PAYMENT_PENDING, EnumSet.of(RideStatus.PAYMENT_COMPLETED, RideStatus.TRIP_CANCELLED, RideStatus.DISPUTED));
        transitions.put(RideStatus.PAYMENT_COMPLETED, EnumSet.of(RideStatus.TRIP_COMPLETED, RideStatus.DISPUTED));
        transitions.put(RideStatus.TRIP_COMPLETED, EnumSet.noneOf(RideStatus.class));
        transitions.put(RideStatus.DISPUTED, EnumSet.of(RideStatus.PAYMENT_PENDING, RideStatus.PAYMENT_COMPLETED, RideStatus.TRIP_CANCELLED, RideStatus.TRIP_COMPLETED));
    }

    public void assertTransition(RideStatus from, RideStatus to) {
        if (from == to) {
            return;
        }

        Set<RideStatus> allowed = transitions.getOrDefault(from, EnumSet.noneOf(RideStatus.class));
        if (!allowed.contains(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride cannot move from " + from + " to " + to);
        }
    }

    public Set<RideStatus> activeCustomerStatuses() {
        return EnumSet.of(
            RideStatus.REQUESTED,
            RideStatus.DRIVER_ASSIGNED,
            RideStatus.DRIVER_ACCEPTED,
            RideStatus.DRIVER_ARRIVED,
            RideStatus.TRIP_STARTED,
            RideStatus.PAYMENT_PENDING,
            RideStatus.PAYMENT_COMPLETED,
            RideStatus.DISPUTED
        );
    }

    public Set<RideStatus> activeDriverStatuses() {
        return EnumSet.of(
            RideStatus.DRIVER_ACCEPTED,
            RideStatus.DRIVER_ARRIVED,
            RideStatus.TRIP_STARTED,
            RideStatus.PAYMENT_PENDING,
            RideStatus.PAYMENT_COMPLETED,
            RideStatus.DISPUTED
        );
    }

    public boolean isTerminal(RideStatus status) {
        return status == RideStatus.DRIVER_REJECTED
            || status == RideStatus.TRIP_CANCELLED
            || status == RideStatus.TRIP_COMPLETED;
    }
}
