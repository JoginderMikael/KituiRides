package com.kituirides.api.admin;

import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.user.UserProfileResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.dashboard()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> users() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.allUsers()));
    }

    @GetMapping("/rides")
    public ResponseEntity<ApiResponse<List<RideResponse>>> rides() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.allRides()));
    }

    @PatchMapping("/drivers/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveDriver(@PathVariable Long id,
                                                           @Valid @RequestBody ApproveDriverRequest request) {
        String message = adminService.approveDriver(id, request.approved());
        return ResponseEntity.ok(ApiResponse.ok(null, message));
    }
}
