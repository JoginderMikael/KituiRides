package com.kituirides.api.admin;

import jakarta.validation.constraints.NotNull;

public record ApproveDriverRequest(@NotNull Boolean approved) {
}
