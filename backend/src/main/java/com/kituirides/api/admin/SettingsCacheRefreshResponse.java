package com.kituirides.api.admin;

import java.time.Instant;

public record SettingsCacheRefreshResponse(
    String cacheStatus,
    Instant refreshedAt,
    Integer cachedSettings,
    String message
) {
}
