package com.kituirides.api.ride;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.enums.RideStatus;
import org.junit.jupiter.api.Test;

class RideStateMachineTest {

    private final RideStateMachine stateMachine = new RideStateMachine();

    @Test
    void shouldAllowConfiguredTransitions() {
        assertDoesNotThrow(() -> stateMachine.assertTransition(RideStatus.REQUESTED, RideStatus.DRIVER_ASSIGNED));
        assertDoesNotThrow(() -> stateMachine.assertTransition(RideStatus.DRIVER_ARRIVED, RideStatus.TRIP_STARTED));
    }

    @Test
    void shouldRejectInvalidTransitions() {
        assertThrows(ApiException.class, () -> stateMachine.assertTransition(RideStatus.REQUESTED, RideStatus.TRIP_STARTED));
    }

    @Test
    void shouldExposeActiveAndTerminalStates() {
        assertTrue(stateMachine.activeCustomerStatuses().contains(RideStatus.PAYMENT_PENDING));
        assertTrue(stateMachine.activeDriverStatuses().contains(RideStatus.TRIP_STARTED));
        assertTrue(stateMachine.isTerminal(RideStatus.TRIP_COMPLETED));
        assertFalse(stateMachine.isTerminal(RideStatus.PAYMENT_PENDING));
    }
}
