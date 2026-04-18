package com.kituirides.api;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.kituirides.api.auth.AuthService;
import com.kituirides.api.auth.RegisterRequest;
import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtService;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RiderProfileRepository riderProfileRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void registerShouldFailWhenEmailExists() {
        RegisterRequest request = new RegisterRequest(
            "Jane", "Doe", "jane@example.com", "254700000000", "password", Set.of(Role.CUSTOMER)
        );
        when(userRepository.existsByEmail(request.email())).thenReturn(true);

        assertThrows(ApiException.class, () -> authService.register(request));
    }
}
