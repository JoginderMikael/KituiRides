package com.kituirides.api.admin.controller;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.admin.SettingsCacheRefreshResponse;
import com.kituirides.api.admin.SystemSettingsResponse;
import com.kituirides.api.admin.UpdateSystemSettingsRequest;
import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.security.CurrentUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
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

/**
 * Exposes administrative configuration endpoints for platform settings management.
 */
@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@Tag(name = "Admin Settings", description = "Administrative platform configuration endpoints")
@SecurityRequirement(name = "bearerAuth")
public class AdminSettingsController {

    private final AdminSettingsService settingsService;
    private final CurrentUserService currentUserService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Get platform settings",
        description = "Returns the current pricing and support settings visible to administrators."
    )
    public ResponseEntity<ApiResponse<SystemSettingsResponse>> getSystemSettings() {
        return ResponseEntity.ok(ApiResponse.ok(settingsService.getSystemSettings()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Update platform settings",
        description = "Saves administrative updates to pricing and operational controls."
    )
    public ResponseEntity<ApiResponse<SystemSettingsResponse>> updateSystemSettings(
        @Valid @RequestBody UpdateSystemSettingsRequest request
    ) {
        User admin = currentUserService.getCurrentUser();
        SystemSettingsResponse response = settingsService.updateSystemSettings(request, admin);
        return ResponseEntity.ok(ApiResponse.ok(response, "Platform controls updated"));
    }

    @PostMapping("/cache/refresh")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Refresh cached settings",
        description = "Forces a refresh of the distributed settings cache and returns diagnostics."
    )
    public ResponseEntity<ApiResponse<SettingsCacheRefreshResponse>> refreshCache() {
        User admin = currentUserService.getCurrentUser();
        SettingsCacheRefreshResponse response = settingsService.refreshCache(admin);
        return ResponseEntity.ok(ApiResponse.ok(response, response.message()));
    }

    @PostMapping("/defaults/restore")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Restore default settings",
        description = "Resets configurable platform settings back to their default values."
    )
    public ResponseEntity<ApiResponse<SystemSettingsResponse>> restoreDefaults() {
        User admin = currentUserService.getCurrentUser();
        SystemSettingsResponse response = settingsService.restoreDefaults(admin);
        return ResponseEntity.ok(ApiResponse.ok(response, "Platform controls restored to defaults"));
    }
}
