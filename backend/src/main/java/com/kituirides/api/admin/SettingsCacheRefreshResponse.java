package com.kituirides.api.admin;

import java.time.Instant;

/**
 * Response payload for settings cache refresh.
 */
public record SettingsCacheRefreshResponse(
    String cacheStatus,
    Instant refreshedAt,
    Integer cachedSettings,
    String message
) {
}
