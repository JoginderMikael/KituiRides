package com.kituirides.api.config;

import com.kituirides.api.admin.AdminSettingKey;
import com.kituirides.api.domain.entity.AdminConfig;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.AdminConfigRepository;
import com.kituirides.api.repository.UserRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Initialize system data on application startup:
 * - Create configured superadmin user if credentials are supplied
 * - Create default admin configuration values
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AdminConfigRepository adminConfigRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.superadmin.email:}")
    private String superadminEmail;

    @Value("${app.superadmin.password:}")
    private String superadminPassword;

    @Value("${app.superadmin.first-name:Super}")
    private String superadminFirstName;

    @Value("${app.superadmin.last-name:Admin}")
    private String superadminLastName;

    @Value("${app.superadmin.phone:}")
    private String superadminPhone;

    @Override
    public void run(String... args) throws Exception {
        // Initialize admin user
        initializeAdminUser();
        
        // Initialize admin configuration settings
        initializeAdminConfigs();
        
        log.info("Data initialization completed");
    }

    /**
     * Create configured superadmin user if none exists.
     */
    private void initializeAdminUser() {
        if (!StringUtils.hasText(superadminEmail) || !StringUtils.hasText(superadminPassword)) {
            log.info("Superadmin bootstrap skipped; APP_SUPERADMIN_EMAIL and APP_SUPERADMIN_PASSWORD are not configured");
            return;
        }

        User existing = userRepository.findByEmail(superadminEmail).orElse(null);

        if (existing != null) {
            log.info("Superadmin user already exists");
            return;
        }

        User superadmin = new User();
        superadmin.setFirstName(superadminFirstName);
        superadmin.setLastName(superadminLastName);
        superadmin.setEmail(superadminEmail);
        superadmin.setPhoneNumber(superadminPhone);
        superadmin.setPasswordHash(passwordEncoder.encode(superadminPassword));
        superadmin.setRole(Role.ADMIN);
        superadmin.setActive(true);
        superadmin.setCreatedAt(Instant.now());

        try {
            userRepository.save(superadmin);
            log.info("Superadmin user created successfully: {}", superadminEmail);
        } catch (Exception e) {
            log.error("Error creating superadmin user", e);
        }
    }

    /**
     * Create default admin configuration settings
     */
    private void initializeAdminConfigs() {
        for (AdminSettingKey settingKey : AdminSettingKey.values()) {
            AdminConfig existing = adminConfigRepository.findByConfigKey(settingKey.configKey()).orElse(null);

            if (existing != null) {
                boolean metadataUpdated = false;
                if (!settingKey.description().equals(existing.getDescription())) {
                    existing.setDescription(settingKey.description());
                    metadataUpdated = true;
                }
                if (existing.getVersion() == null || existing.getVersion() < 1L) {
                    existing.setVersion(1L);
                    metadataUpdated = true;
                }
                if (existing.getUpdatedAt() == null) {
                    existing.setUpdatedAt(Instant.now());
                    metadataUpdated = true;
                }
                if (existing.getCreatedAt() == null) {
                    existing.setCreatedAt(Instant.now());
                    metadataUpdated = true;
                }
                if (metadataUpdated) {
                    adminConfigRepository.save(existing);
                    log.info("Admin config metadata synchronized: {}", settingKey.configKey());
                } else {
                    log.debug("Config {} already exists", settingKey.configKey());
                }
                continue;
            }

            AdminConfig adminConfig = new AdminConfig();
            adminConfig.setConfigKey(settingKey.configKey());
            adminConfig.setConfigValue(settingKey.defaultValue());
            adminConfig.setDescription(settingKey.description());
            adminConfig.setVersion(1L);
            adminConfig.setCreatedAt(Instant.now());
            adminConfig.setUpdatedAt(Instant.now());

            try {
                adminConfigRepository.save(adminConfig);
                log.info("Default config created: {} = {}", settingKey.configKey(), settingKey.defaultValue());
            } catch (Exception e) {
                log.error("Error creating config {}", settingKey.configKey(), e);
            }
        }
    }
}
