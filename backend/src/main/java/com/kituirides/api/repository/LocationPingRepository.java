package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationPingRepository extends JpaRepository<LocationPing, Long> {
    Optional<LocationPing> findTopByUserOrderByTimestampDesc(User user);
}
