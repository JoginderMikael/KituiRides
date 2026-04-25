package com.kituirides.api.admin;

import jakarta.validation.constraints.NotNull;

/**
 * Request payload for approve driver.
 */
public record ApproveDriverRequest(@NotNull Boolean approved) {
}
