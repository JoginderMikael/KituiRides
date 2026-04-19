package com.kituirides.api.admin;

import com.kituirides.api.domain.entity.AdminConfig;
import com.kituirides.api.domain.entity.AuditLog;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.AuditAction;
import com.kituirides.api.repository.AdminConfigRepository;
import com.kituirides.api.repository.AuditLogRepository;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminSettingsService {

    private final AdminConfigRepository configRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Get all admin configurations
     */
    public List<AdminConfig> getAllConfigs() {
        return configRepository.findAll();
    }

    /**
     * Get specific configuration value
     */
    public String getConfigValue(String configKey) {
        return configRepository.findByConfigKey(configKey)
                .map(AdminConfig::getConfigValue)
                .orElse(null);
    }

    /**
     * Get configuration as Double
     */
    public Double getConfigAsDouble(String configKey) {
        String value = getConfigValue(configKey);
        return value != null ? Double.parseDouble(value) : null;
    }

    /**
     * Update configuration value
     */
    @Transactional
    public AdminConfig updateConfig(String configKey, String newValue, User admin) {
        AdminConfig config = configRepository.findByConfigKey(configKey)
                .orElseGet(() -> createNewConfig(configKey, newValue));

        String oldValue = config.getConfigValue();
        config.setConfigValue(newValue);
        config.setUpdatedAt(Instant.now());

        config = configRepository.save(config);

        // Log audit entry
        createAuditLog(admin, "AdminConfig", config.getId(), AuditAction.UPDATE, 
                      Map.of("configKey", configKey, "value", oldValue),
                      Map.of("configKey", configKey, "value", newValue));

        log.info("Updated admin config {} from '{}' to '{}'", configKey, oldValue, newValue);
        return config;
    }

    /**
     * Create new configuration
     */
    private AdminConfig createNewConfig(String configKey, String value) {
        AdminConfig config = new AdminConfig();
        config.setConfigKey(configKey);
        config.setConfigValue(value);
        config.setCreatedAt(Instant.now());
        config.setUpdatedAt(Instant.now());
        return config;
    }

    /**
     * Update multiple configurations at once
     */
    @Transactional
    public List<AdminConfig> updateMultipleConfigs(Map<String, String> updates, User admin) {
        List<AdminConfig> updated = updates.entrySet().stream()
                .map(entry -> updateConfig(entry.getKey(), entry.getValue(), admin))
                .toList();
        
        log.info("Updated {} admin configurations", updated.size());
        return updated;
    }

    /**
     * Reset configuration to default value
     */
    @Transactional
    public AdminConfig resetConfig(String configKey, User admin) {
        AdminConfig config = configRepository.findByConfigKey(configKey)
                .orElseThrow(() -> new IllegalArgumentException("Configuration not found"));

        String defaultValue = getDefaultValue(configKey);
        String oldValue = config.getConfigValue();

        config.setConfigValue(defaultValue);
        config.setUpdatedAt(Instant.now());
        config = configRepository.save(config);

        createAuditLog(admin, "AdminConfig", config.getId(), AuditAction.UPDATE,
                      Map.of("configKey", configKey, "value", oldValue),
                      Map.of("configKey", configKey, "value", defaultValue));

        log.info("Reset admin config {} to default value '{}'", configKey, defaultValue);
        return config;
    }

    /**
     * Get default configuration values
     */
    private String getDefaultValue(String configKey) {
        return switch (configKey) {
            case "BASE_FARE" -> "100";
            case "FUEL_COST_PER_LITER" -> "200";
            case "DRIVER_MARKUP" -> "1.5";
            case "COMPANY_COMMISSION_RATE" -> "0.20";
            case "MOTORCYCLE_FUEL_ECONOMY" -> "37";
            default -> "";
        };
    }

    /**
     * Create audit log entry
     */
    private void createAuditLog(User admin, String entityType, Long entityId, 
                               AuditAction action, Object oldValues, Object newValues) {
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

    /**
     * Get audit logs for a specific admin
     */
    public List<AuditLog> getAdminAuditLogs(Long adminId) {
        return auditLogRepository.findByAdmin_IdOrderByCreatedAtDesc(adminId);
    }

    /**
     * Get audit logs by entity type and action
     */
    public List<AuditLog> getAuditLogs(String entityType, AuditAction action) {
        return auditLogRepository.findByEntityTypeAndActionOrderByCreatedAtDesc(entityType, action);
    }
}
