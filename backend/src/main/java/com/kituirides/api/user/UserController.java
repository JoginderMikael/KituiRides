package com.kituirides.api.user;

import com.kituirides.api.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes profile endpoints for the authenticated user.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Authenticated user profile endpoints")
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Operation(summary = "Get my profile", description = "Returns the authenticated user's profile details.")
    public ResponseEntity<ApiResponse<UserProfileResponse>> me() {
        return ResponseEntity.ok(ApiResponse.ok(userService.me()));
    }

    @PutMapping("/me")
    @Operation(summary = "Update my profile", description = "Updates profile details for the authenticated user.")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMe(@Valid @RequestBody UpdateProfileRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateMyProfile(request), "Profile updated"));
    }
}
