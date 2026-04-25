package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.Role;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Provides persistence access for user.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);
    boolean existsByEmail(String email);
    boolean existsByPhoneNumber(String phoneNumber);
    List<User> findByRole(Role role);
    List<User> findByRoleInAndActiveTrueOrderByFirstNameAscLastNameAsc(List<Role> roles);
}
