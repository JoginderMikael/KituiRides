package com.kituirides.api.admin.controller;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.domain.entity.AdminConfig;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtTokenProvider;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final AdminSettingsService settingsService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    /**
     * Get all configurations
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminConfig>> getAllConfigs() {
        List<AdminConfig> configs = settingsService.getAllConfigs();
        return ResponseEntity.ok(configs);
    }

    /**
     * Get specific configuration
     */
    @GetMapping("/{configKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminConfigResponse> getConfig(@PathVariable String configKey) {
        String value = settingsService.getConfigValue(configKey);
        if (value == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new AdminConfigResponse(configKey, value));
    }

    /**
     * Update configuration
     */
    @PutMapping("/{configKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminConfig> updateConfig(
            @PathVariable String configKey,
            @RequestBody Map<String, String> request,
            @RequestHeader("Authorization") String token) {
        
        Long adminId = extractUserIdFromToken(token);
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        String newValue = request.get("value");
        AdminConfig config = settingsService.updateConfig(configKey, newValue, admin);
        
        return ResponseEntity.ok(config);
    }

    /**
     * Update multiple configurations
     */
    @PutMapping("/batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AdminConfig>> updateMultipleConfigs(
            @RequestBody Map<String, String> updates,
            @RequestHeader("Authorization") String token) {
        
        Long adminId = extractUserIdFromToken(token);
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        List<AdminConfig> configs = settingsService.updateMultipleConfigs(updates, admin);
        return ResponseEntity.ok(configs);
    }

    /**
     * Reset configuration to default
     */
    @PostMapping("/{configKey}/reset")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminConfig> resetConfig(
            @PathVariable String configKey,
            @RequestHeader("Authorization") String token) {
        
        Long adminId = extractUserIdFromToken(token);
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new IllegalArgumentException("Admin not found"));
        
        AdminConfig config = settingsService.resetConfig(configKey, admin);
        return ResponseEntity.ok(config);
    }

    /**
     * Get pricing configuration summary
     */
    @GetMapping("/pricing/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getPricingSummary() {
        Map<String, String> summary = new HashMap<>();
        summary.put("BASE_FARE", settingsService.getConfigValue("BASE_FARE"));
        summary.put("FUEL_COST_PER_LITER", settingsService.getConfigValue("FUEL_COST_PER_LITER"));
        summary.put("DRIVER_MARKUP", settingsService.getConfigValue("DRIVER_MARKUP"));
        summary.put("COMPANY_COMMISSION_RATE", settingsService.getConfigValue("COMPANY_COMMISSION_RATE"));
        summary.put("MOTORCYCLE_FUEL_ECONOMY", settingsService.getConfigValue("MOTORCYCLE_FUEL_ECONOMY"));
        
        return ResponseEntity.ok(summary);
    }

    /**
     * Extract user ID from JWT token
     */
    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    // DTO
    public static class AdminConfigResponse {
        private String key;
        private String value;

        public AdminConfigResponse(String key, String value) {
            this.key = key;
            this.value = value;
        }

        public String getKey() {
            return key;
        }

        public void setKey(String key) {
            this.key = key;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }
}
