package com.kituirides.api.matching;

import com.kituirides.api.domain.entity.User;

public record DriverMatchResult(
    User rider,
    int etaMinutes,
    double distanceKm
) {
}
