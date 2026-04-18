package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RiderProfileRepository extends JpaRepository<RiderProfile, Long> {
    Optional<RiderProfile> findByUser(User user);
    List<RiderProfile> findByVerifiedTrueAndAvailableTrue();
}
