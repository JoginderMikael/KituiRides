package com.kituirides.api.admin;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.AdminConfig;
import com.kituirides.api.domain.entity.AuditLog;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.AuditAction;
import com.kituirides.api.repository.AdminConfigRepository;
import com.kituirides.api.repository.AuditLogRepository;
import com.kituirides.api.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminSettingsService {

    private static final String SETTINGS_CACHE_HASH_KEY = "admin:settings:v2";
    private static final String SETTINGS_CACHE_META_KEY = "admin:settings:v2:meta";
    private static final String CACHE_STATUS_SYNCED = "SYNCED";
    private static final String CACHE_STATUS_STALE = "STALE";
    private static final String CACHE_STATUS_UNAVAILABLE = "UNAVAILABLE";

    private final AdminConfigRepository configRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final StringRedisTemplate redisTemplate;

    public List<AdminConfig> getAllConfigs() {
        return getPersistedConfigs();
    }

    public String getConfigValue(String configKey) {
        Map<String, String> cachedSettings = readSettingsFromCache();
        if (cachedSettings.containsKey(configKey)) {
            return cachedSettings.get(configKey);
        }

        AdminSettingKey settingKey = AdminSettingKey.fromConfigKey(configKey);
        if (settingKey == null) {
            return configRepository.findByConfigKey(configKey).map(AdminConfig::getConfigValue).orElse(null);
        }

        AdminConfig config = getOrCreateConfig(settingKey);
        if (config != null) {
            cacheSingleSetting(config.getConfigKey(), config.getConfigValue());
            return config.getConfigValue();
        }

        return settingKey.defaultValue();
    }

    public BigDecimal getConfigAsDecimal(String configKey) {
        String value = getConfigValue(configKey);
        if (value == null || value.isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Missing configuration value for " + configKey);
        }
        return new BigDecimal(value);
    }

    public boolean getConfigAsBoolean(String configKey) {
        String value = getConfigValue(configKey);
        return Boolean.parseBoolean(value);
    }

    public PricingConfigurationSnapshot getPricingConfiguration() {
        return new PricingConfigurationSnapshot(
            getConfigAsDecimal(AdminSettingKey.BASE_FARE.configKey()),
            getConfigAsDecimal(AdminSettingKey.FUEL_COST_PER_LITER.configKey()),
            getConfigAsDecimal(AdminSettingKey.DRIVER_MARKUP.configKey()),
            getConfigAsDecimal(AdminSettingKey.COMPANY_COMMISSION_RATE.configKey()),
            getConfigAsDecimal(AdminSettingKey.MOTORCYCLE_FUEL_ECONOMY.configKey())
        );
    }

    public SystemSettingsResponse.SupportSettings getSupportSettings() {
        return new SystemSettingsResponse.SupportSettings(
            getConfigValue(AdminSettingKey.SUPPORT_PHONE_NUMBER.configKey()),
            getConfigValue(AdminSettingKey.SUPPORT_EMAIL_ADDRESS.configKey()),
            getConfigValue(AdminSettingKey.SUPPORT_HELP_LABEL.configKey()),
            getConfigValue(AdminSettingKey.SUPPORT_ESCALATION_CONTACT.configKey()),
            getConfigAsBoolean(AdminSettingKey.SUPPORT_EMERGENCY_CONTACT_VISIBLE.configKey())
        );
    }

    public SystemSettingsResponse getSystemSettings() {
        List<AdminConfig> configs = getPersistedConfigs();
        CacheDiagnostics cacheDiagnostics = getCacheDiagnostics(configs);
        if (!CACHE_STATUS_SYNCED.equals(cacheDiagnostics.status())) {
            cacheDiagnostics = refreshCacheInternal(configs);
        }
        PricingConfigurationSnapshot pricingConfiguration = getPricingConfiguration();
        SystemSettingsResponse.SupportSettings supportSettings = getSupportSettings();

        AdminConfig latestUpdate = configs.stream()
            .max(Comparator.comparing(AdminConfig::getUpdatedAt))
            .orElse(null);

        String lastUpdatedByName = latestUpdate == null
            ? "System default"
            : resolveUserDisplayName(latestUpdate.getUpdatedByUserId());

        long highestVersion = configs.stream()
            .map(AdminConfig::getVersion)
            .filter(version -> version != null)
            .max(Long::compareTo)
            .orElse(1L);

        SystemSettingsResponse.SettingsSummary summary = new SystemSettingsResponse.SettingsSummary(
            cacheDiagnostics.status(),
            "SYNCED",
            latestUpdate != null ? latestUpdate.getUpdatedAt() : null,
            lastUpdatedByName,
            cacheDiagnostics.refreshedAt(),
            highestVersion,
            configs.size(),
            cacheDiagnostics.cachedSettings()
        );

        return new SystemSettingsResponse(
            summary,
            new SystemSettingsResponse.PricingSettings(
                pricingConfiguration.baseFare(),
                pricingConfiguration.fuelCostPerLiter(),
                pricingConfiguration.driverMarkup(),
                pricingConfiguration.companyCommissionRate(),
                pricingConfiguration.motorcycleFuelEconomy()
            ),
            supportSettings
        );
    }

    @Transactional
    public SystemSettingsResponse updateSystemSettings(UpdateSystemSettingsRequest request, User admin) {
        validateBusinessRules(request);

        Map<AdminSettingKey, String> updates = new EnumMap<>(AdminSettingKey.class);
        updates.put(AdminSettingKey.BASE_FARE, normalizeDecimal(request.baseFare(), 2));
        updates.put(AdminSettingKey.FUEL_COST_PER_LITER, normalizeDecimal(request.fuelCostPerLiter(), 2));
        updates.put(AdminSettingKey.DRIVER_MARKUP, normalizeDecimal(request.driverMarkup(), 4));
        updates.put(AdminSettingKey.COMPANY_COMMISSION_RATE, normalizeDecimal(request.companyCommissionRate(), 4));
        updates.put(AdminSettingKey.SUPPORT_PHONE_NUMBER, request.supportPhoneNumber().trim());
        updates.put(AdminSettingKey.SUPPORT_EMAIL_ADDRESS, request.supportEmailAddress().trim().toLowerCase());
        updates.put(AdminSettingKey.SUPPORT_HELP_LABEL, request.supportHelpLabel().trim());
        updates.put(AdminSettingKey.SUPPORT_ESCALATION_CONTACT, request.supportEscalationContact().trim());
        updates.put(AdminSettingKey.SUPPORT_EMERGENCY_CONTACT_VISIBLE, String.valueOf(request.emergencyContactVisible()));

        for (Map.Entry<AdminSettingKey, String> entry : updates.entrySet()) {
            updateSetting(entry.getKey(), entry.getValue(), admin);
        }

        CacheDiagnostics diagnostics = refreshCacheInternal(getPersistedConfigs());
        log.info("System settings updated by adminId={}, cacheStatus={}", admin.getId(), diagnostics.status());
        return getSystemSettings();
    }

    @Transactional
    public SystemSettingsResponse restoreDefaults(User admin) {
        for (AdminSettingKey settingKey : AdminSettingKey.values()) {
            updateSetting(settingKey, settingKey.defaultValue(), admin);
        }

        CacheDiagnostics diagnostics = refreshCacheInternal(getPersistedConfigs());
        log.info("System settings restored to defaults by adminId={}, cacheStatus={}", admin.getId(), diagnostics.status());
        return getSystemSettings();
    }

    public SettingsCacheRefreshResponse refreshCache(User admin) {
        CacheDiagnostics diagnostics = refreshCacheInternal(getPersistedConfigs());
        String message = switch (diagnostics.status()) {
            case CACHE_STATUS_SYNCED -> "Settings cache refreshed successfully";
            case CACHE_STATUS_STALE -> "Settings cache was refreshed with a stale or partial result";
            default -> "Redis cache is unavailable. Database values remain active.";
        };

        createAuditLog(
            admin,
            "AdminSettingsCache",
            null,
            AuditAction.UPDATE,
            Map.of("trigger", "manual-refresh"),
            Map.of("status", diagnostics.status(), "cachedSettings", diagnostics.cachedSettings())
        );

        return new SettingsCacheRefreshResponse(
            diagnostics.status(),
            diagnostics.refreshedAt(),
            diagnostics.cachedSettings(),
            message
        );
    }

    public List<AuditLog> getAdminAuditLogs(Long adminId) {
        return auditLogRepository.findByAdmin_IdOrderByCreatedAtDesc(adminId);
    }

    public List<AuditLog> getAuditLogs(String entityType, AuditAction action) {
        return auditLogRepository.findByEntityTypeAndActionOrderByCreatedAtDesc(entityType, action);
    }

    private void validateBusinessRules(UpdateSystemSettingsRequest request) {
        if (request.companyCommissionRate().compareTo(BigDecimal.ONE) >= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Company commission must remain below 1.0");
        }
        if (request.driverMarkup().compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Driver markup cannot be negative");
        }
    }

    private String normalizeDecimal(BigDecimal value, int scale) {
        return value.setScale(scale, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private List<AdminConfig> getPersistedConfigs() {
        Map<String, AdminConfig> existingByKey = new HashMap<>();
        for (AdminConfig config : configRepository.findAll()) {
            existingByKey.put(config.getConfigKey(), config);
        }

        List<AdminConfig> createdOrUpdated = new ArrayList<>();
        for (AdminSettingKey settingKey : AdminSettingKey.values()) {
            AdminConfig existing = existingByKey.get(settingKey.configKey());
            if (existing == null) {
                createdOrUpdated.add(configRepository.save(buildDefaultConfig(settingKey)));
                continue;
            }

            boolean metadataChanged = false;
            if (!settingKey.description().equals(existing.getDescription())) {
                existing.setDescription(settingKey.description());
                metadataChanged = true;
            }
            if (existing.getVersion() == null || existing.getVersion() < 1) {
                existing.setVersion(1L);
                metadataChanged = true;
            }
            if (metadataChanged) {
                createdOrUpdated.add(configRepository.save(existing));
            }
        }

        if (!createdOrUpdated.isEmpty()) {
            log.info("Synchronized {} admin setting definition(s)", createdOrUpdated.size());
        }

        return configRepository.findAll().stream()
            .filter(config -> AdminSettingKey.fromConfigKey(config.getConfigKey()) != null)
            .sorted(Comparator.comparingInt(config -> AdminSettingKey.fromConfigKey(config.getConfigKey()).displayOrder()))
            .toList();
    }

    private AdminConfig getOrCreateConfig(AdminSettingKey settingKey) {
        return configRepository.findByConfigKey(settingKey.configKey())
            .orElseGet(() -> configRepository.save(buildDefaultConfig(settingKey)));
    }

    private AdminConfig buildDefaultConfig(AdminSettingKey settingKey) {
        AdminConfig config = new AdminConfig();
        config.setConfigKey(settingKey.configKey());
        config.setConfigValue(settingKey.defaultValue());
        config.setDescription(settingKey.description());
        config.setVersion(1L);
        config.setCreatedAt(Instant.now());
        config.setUpdatedAt(Instant.now());
        return config;
    }

    private AdminConfig updateSetting(AdminSettingKey settingKey, String newValue, User admin) {
        AdminConfig config = getOrCreateConfig(settingKey);
        String oldValue = config.getConfigValue();

        if (newValue.equals(oldValue) && config.getUpdatedByUserId() != null) {
            return config;
        }

        config.setConfigValue(newValue);
        config.setDescription(settingKey.description());
        config.setUpdatedAt(Instant.now());
        config.setUpdatedByUserId(admin.getId());
        config.setVersion((config.getVersion() == null ? 1L : config.getVersion()) + 1L);
        AdminConfig saved = configRepository.save(config);

        createAuditLog(
            admin,
            "AdminConfig",
            saved.getId(),
            AuditAction.UPDATE,
            Map.of("configKey", settingKey.configKey(), "value", oldValue),
            Map.of("configKey", settingKey.configKey(), "value", newValue)
        );

        return saved;
    }

    private CacheDiagnostics refreshCacheInternal(List<AdminConfig> configs) {
        HashOperations<String, Object, Object> hashOperations = redisTemplate.opsForHash();
        Instant refreshedAt = Instant.now();

        try {
            Map<String, String> cachePayload = new LinkedHashMap<>();
            for (AdminConfig config : configs) {
                cachePayload.put(config.getConfigKey(), config.getConfigValue());
            }

            redisTemplate.delete(SETTINGS_CACHE_HASH_KEY);
            redisTemplate.delete(SETTINGS_CACHE_META_KEY);
            hashOperations.putAll(SETTINGS_CACHE_HASH_KEY, cachePayload);
            hashOperations.put(SETTINGS_CACHE_META_KEY, "refreshedAt", refreshedAt.toString());
            hashOperations.put(SETTINGS_CACHE_META_KEY, "cachedSettings", String.valueOf(cachePayload.size()));

            return new CacheDiagnostics(CACHE_STATUS_SYNCED, refreshedAt, cachePayload.size());
        } catch (DataAccessException exception) {
            log.warn("Failed to refresh admin settings cache", exception);
            return new CacheDiagnostics(CACHE_STATUS_UNAVAILABLE, null, 0);
        }
    }

    private Map<String, String> readSettingsFromCache() {
        HashOperations<String, Object, Object> hashOperations = redisTemplate.opsForHash();
        try {
            Map<Object, Object> rawCache = hashOperations.entries(SETTINGS_CACHE_HASH_KEY);
            Map<String, String> parsed = new HashMap<>();
            for (Map.Entry<Object, Object> entry : rawCache.entrySet()) {
                parsed.put(String.valueOf(entry.getKey()), String.valueOf(entry.getValue()));
            }
            return parsed;
        } catch (DataAccessException exception) {
            log.warn("Failed to read admin settings cache", exception);
            return Map.of();
        }
    }

    private CacheDiagnostics getCacheDiagnostics(List<AdminConfig> configs) {
        HashOperations<String, Object, Object> hashOperations = redisTemplate.opsForHash();
        try {
            Map<Object, Object> rawCache = hashOperations.entries(SETTINGS_CACHE_HASH_KEY);
            Map<Object, Object> metaCache = hashOperations.entries(SETTINGS_CACHE_META_KEY);

            if (rawCache.isEmpty()) {
                return new CacheDiagnostics(CACHE_STATUS_STALE, null, 0);
            }

            Instant refreshedAt = metaCache.containsKey("refreshedAt")
                ? Instant.parse(String.valueOf(metaCache.get("refreshedAt")))
                : null;

            int cachedSettings = rawCache.size();
            String status = cachedSettings >= configs.size() ? CACHE_STATUS_SYNCED : CACHE_STATUS_STALE;
            return new CacheDiagnostics(status, refreshedAt, cachedSettings);
        } catch (Exception exception) {
            log.warn("Failed to read admin settings cache diagnostics", exception);
            return new CacheDiagnostics(CACHE_STATUS_UNAVAILABLE, null, 0);
        }
    }

    private void cacheSingleSetting(String configKey, String value) {
        try {
            redisTemplate.opsForHash().put(SETTINGS_CACHE_HASH_KEY, configKey, value);
        } catch (DataAccessException exception) {
            log.warn("Failed to cache admin setting {}", configKey, exception);
        }
    }

    private String resolveUserDisplayName(Long userId) {
        if (userId == null) {
            return "System default";
        }

        return userRepository.findById(userId)
            .map(user -> user.getFirstName() + " " + user.getLastName())
            .orElse("Unknown admin");
    }

    private void createAuditLog(User admin, String entityType, Long entityId, AuditAction action, Object oldValues, Object newValues) {
        AuditLog auditLog = new AuditLog();
        auditLog.setAdmin(admin);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setAction(action);
        auditLog.setOldValues(oldValues);
        auditLog.setNewValues(newValues);
        auditLog.setCreatedAt(Instant.now());
        auditLogRepository.save(auditLog);
    }

    private record CacheDiagnostics(String status, Instant refreshedAt, int cachedSettings) {
    }
}
