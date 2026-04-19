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
        // Check if any admin user exists
        boolean adminExists = userRepository.findByEmail("admin@example.com").isPresent();
        
        if (adminExists) {
            log.info("Superadmin user already exists");
            return;
        }

        // Create new superadmin user
        User superadmin = new User();
        superadmin.setFirstName("Super");
        superadmin.setLastName("Admin");
        superadmin.setEmail("admin@example.com");
        superadmin.setPhoneNumber("replace-with-admin-phone");
        superadmin.setPasswordHash(passwordEncoder.encode("admin@example.com"));
        superadmin.setRole(Role.ADMIN);
        superadmin.setActive(true);
        superadmin.setCreatedAt(Instant.now());

        try {
            userRepository.save(superadmin);
            log.info("Superadmin user created successfully: admin@example.com");
        } catch (Exception e) {
            log.error("Error creating superadmin user", e);
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
