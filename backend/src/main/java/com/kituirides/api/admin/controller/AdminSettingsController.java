package com.kituirides.api.admin.controller;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.admin.SettingsCacheRefreshResponse;
import com.kituirides.api.admin.SystemSettingsResponse;
import com.kituirides.api.admin.UpdateSystemSettingsRequest;
import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.security.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final AdminSettingsService settingsService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SystemSettingsResponse>> getSystemSettings() {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getSystemSettings()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SystemSettingsResponse>> updateSystemSettings(
        @Valid @RequestBody UpdateSystemSettingsRequest request
    ) {
        User admin = currentUserService.getCurrentUser();
        SystemSettingsResponse response = settingsService.updateSystemSettings(request, admin);
        return ResponseEntity.ok(ApiResponse.ok(response, "Platform controls updated"));
    }

    @PostMapping("/cache/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SettingsCacheRefreshResponse>> refreshCache() {
        User admin = currentUserService.getCurrentUser();
        SettingsCacheRefreshResponse response = settingsService.refreshCache(admin);
        return ResponseEntity.ok(ApiResponse.ok(response, response.message()));
    }

    @PostMapping("/defaults/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SystemSettingsResponse>> restoreDefaults() {
        User admin = currentUserService.getCurrentUser();
        SystemSettingsResponse response = settingsService.restoreDefaults(admin);
        return ResponseEntity.ok(ApiResponse.ok(response, "Platform controls restored to defaults"));
    }
}
