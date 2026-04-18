package com.kituirides.api.driver;

import jakarta.validation.constraints.NotNull;

public record UpdateDriverStatusRequest(@NotNull Boolean online) {
}
