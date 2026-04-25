package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

/**
 * Provides persistence access for rider profile.
 */
public interface RiderProfileRepository extends JpaRepository<RiderProfile, Long> {
    @EntityGraph(attributePaths = "user")
    @Query("select profile from RiderProfile profile")
    List<RiderProfile> findAllWithUser();

    Optional<RiderProfile> findByUser(User user);
    Optional<RiderProfile> findByUserId(Long userId);
    List<RiderProfile> findByVerifiedTrueAndAvailableTrue();
}
