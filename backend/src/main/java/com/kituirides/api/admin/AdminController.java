package com.kituirides.api.admin;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.user.UserProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Provides administrative endpoints for managing users, drivers, rides, and support staff.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Administrative dashboards and account management operations")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    @Operation(
        summary = "Get admin dashboard",
        description = "Returns aggregate metrics and operational snapshots for administrators."
    )
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.dashboard()));
    }

    @GetMapping("/users")
    @Operation(summary = "List users", description = "Returns all registered user accounts visible to administrators.")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> users() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.allUsers()));
    }

    @GetMapping("/rides")
    @Operation(summary = "List rides", description = "Returns all ride records for administrative review.")
    public ResponseEntity<ApiResponse<List<RideResponse>>> rides() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.allRides()));
    }

    @PatchMapping("/drivers/{id}/approve")
    @Operation(
        summary = "Approve or reject a driver",
        description = "Updates a driver's approval state based on the submitted review decision."
    )
    public ResponseEntity<ApiResponse<Void>> approveDriver(@PathVariable Long id,
                                                           @Valid @RequestBody ApproveDriverRequest request) {
        String message = adminService.approveDriver(id, request.approved());
        return ResponseEntity.ok(ApiResponse.ok(null, message));
    }

    @PatchMapping("/drivers/{id}/details")
    @Operation(
        summary = "Update driver details",
        description = "Applies administrative changes to a driver's registration details."
    )
    public ResponseEntity<ApiResponse<Void>> updateDriverDetails(@PathVariable Long id,
                                                                 @Valid @RequestBody UpdateDriverDetailsRequest request) {
        String message = adminService.updateDriverDetails(id, request);
        return ResponseEntity.ok(ApiResponse.ok(null, message));
    }

    @PostMapping("/support-agents")
    @Operation(
        summary = "Create a support agent",
        description = "Creates a support agent account that can manage the support queue."
    )
    public ResponseEntity<ApiResponse<UserProfileResponse>> createSupportAgent(@Valid @RequestBody CreateSupportAgentRequest request) {
        UserProfileResponse response = adminService.createSupportAgent(request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Support agent created"));
    }

    @PatchMapping("/users/{id}/upgrade")
    @Operation(summary = "Upgrade a user to admin", description = "Promotes an existing user account to an administrator role.")
    public ResponseEntity<ApiResponse<Void>> upgradeToAdmin(@PathVariable Long id) {
        String message = adminService.upgradeToAdmin(id);
        return ResponseEntity.ok(ApiResponse.ok(null, message));
    }

    @PatchMapping("/users/{id}")
    @Operation(summary = "Update a user account", description = "Updates administrative account details for an existing user.")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateUserAccount(@PathVariable Long id,
                                                                              @Valid @RequestBody UpdateUserAccountRequest request) {
        UserProfileResponse response = adminService.updateUserAccount(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "User account updated"));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Delete a user account", description = "Removes a user account and returns an operation result message.")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        String message = adminService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok(null, message));
    }
}
