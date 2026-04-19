package com.kituirides.api.config;

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
        // Define default configs
        String[][] configs = {
            {"BASE_FARE", "150", "Base fare for trip commencement (KES)"},
            {"FUEL_COST_PER_LITER", "200", "Current fuel cost per liter (KES)"},
            {"DRIVER_MARKUP", "1.5", "Driver markup multiplier for profit margin"},
            {"COMPANY_COMMISSION_RATE", "0.20", "Company commission rate (20% = 0.20)"},
            {"MOTORCYCLE_FUEL_ECONOMY", "37", "Motorcycle fuel economy (km/liter)"},
            {"SUPPORT_PHONE_NUMBER", "+254797753625", "Support hotline phone number"}
        };

        for (String[] config : configs) {
            String key = config[0];
            String value = config[1];
            String description = config[2];

            // Check if config already exists
            boolean exists = adminConfigRepository.findByConfigKey(key).isPresent();
            
            if (exists) {
                log.debug("Config {} already exists", key);
                continue;
            }

            // Create new config
            AdminConfig adminConfig = new AdminConfig();
            adminConfig.setConfigKey(key);
            adminConfig.setConfigValue(value);
            adminConfig.setDescription(description);
            adminConfig.setCreatedAt(Instant.now());
            adminConfig.setUpdatedAt(Instant.now());

            try {
                adminConfigRepository.save(adminConfig);
                log.info("Default config created: {} = {}", key, value);
            } catch (Exception e) {
                log.error("Error creating config {}", key, e);
            }
        }
    }
}
