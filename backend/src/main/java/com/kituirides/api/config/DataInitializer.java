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
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Initialize system data on application startup:
 * - Create default superadmin user if it doesn't exist
 * - Create default admin configuration values
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final String DEFAULT_SUPERADMIN_EMAIL = "admin@example.com";
    private static final String DEFAULT_SUPERADMIN_PASSWORD = "replace-with-a-strong-temporary-password";
    private static final String LEGACY_SUPERADMIN_PASSWORD = "admin@example.com";
    private static final String LEGACY_SUPERADMIN_HASH = "replace-with-generated-password-hash";

    private final UserRepository userRepository;
    private final AdminConfigRepository adminConfigRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize admin user
        initializeAdminUser();
        
        // Initialize admin configuration settings
        initializeAdminConfigs();
        
        log.info("Data initialization completed");
    }

    /**
     * Create default superadmin user if none exists
     */
    private void initializeAdminUser() {
        User existing = userRepository.findByEmail(DEFAULT_SUPERADMIN_EMAIL).orElse(null);

        if (existing != null) {
            repairLegacySuperadminPassword(existing);
            log.info("Superadmin user already exists");
            return;
        }

        // Create new superadmin user
        User superadmin = new User();
        superadmin.setFirstName("Super");
        superadmin.setLastName("Admin");
        superadmin.setEmail(DEFAULT_SUPERADMIN_EMAIL);
        superadmin.setPhoneNumber("replace-with-admin-phone");
        superadmin.setPasswordHash(passwordEncoder.encode(DEFAULT_SUPERADMIN_PASSWORD));
        superadmin.setRole(Role.ADMIN);
        superadmin.setActive(true);
        superadmin.setCreatedAt(Instant.now());

        try {
            userRepository.save(superadmin);
            log.info("Superadmin user created successfully: {}", DEFAULT_SUPERADMIN_EMAIL);
        } catch (Exception e) {
            log.error("Error creating superadmin user", e);
        }
    }

    private void repairLegacySuperadminPassword(User existing) {
        String passwordHash = existing.getPasswordHash();

        if (passwordHash == null || !passwordHash.startsWith("$2")) {
            existing.setPasswordHash(passwordEncoder.encode(DEFAULT_SUPERADMIN_PASSWORD));
            userRepository.save(existing);
            log.warn("Repaired invalid superadmin password hash for {}", DEFAULT_SUPERADMIN_EMAIL);
            return;
        }

        if (passwordEncoder.matches(DEFAULT_SUPERADMIN_PASSWORD, passwordHash)) {
            return;
        }

        if (LEGACY_SUPERADMIN_HASH.equals(passwordHash) || passwordEncoder.matches(LEGACY_SUPERADMIN_PASSWORD, passwordHash)) {
            existing.setPasswordHash(passwordEncoder.encode(DEFAULT_SUPERADMIN_PASSWORD));
            userRepository.save(existing);
            log.warn("Upgraded legacy superadmin password to the documented default for {}", DEFAULT_SUPERADMIN_EMAIL);
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
