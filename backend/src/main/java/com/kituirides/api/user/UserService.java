package com.kituirides.api.user;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.CurrentUserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    public UserProfileResponse me() {
        return toResponse(currentUserService.getCurrentUser());
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UpdateProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        if (!user.getPhoneNumber().equals(request.phoneNumber()) &&
            userRepository.existsByPhoneNumber(request.phoneNumber())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already exists");
        }
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhoneNumber(request.phoneNumber());
        return toResponse(userRepository.save(user));
    }

    public List<UserProfileResponse> listAll() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    public UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getPhoneNumber(),
            user.getRoles()
        );
    }
}
