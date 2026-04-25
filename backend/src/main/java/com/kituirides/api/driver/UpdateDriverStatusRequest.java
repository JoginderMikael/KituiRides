package com.kituirides.api.driver;

import jakarta.validation.constraints.NotNull;

/**
 * Request payload for update driver status.
 */
public record UpdateDriverStatusRequest(@NotNull Boolean online) {
}
