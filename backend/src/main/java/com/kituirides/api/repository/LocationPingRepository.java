package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.LocationPing;
import com.kituirides.api.domain.entity.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationPingRepository extends JpaRepository<LocationPing, Long> {
    Optional<LocationPing> findTopByUserOrderByTimestampDesc(User user);
    List<LocationPing> findByUserAndTimestampBetweenOrderByTimestampAsc(User user, Instant start, Instant end);
    List<LocationPing> findByUser(User user);
}
