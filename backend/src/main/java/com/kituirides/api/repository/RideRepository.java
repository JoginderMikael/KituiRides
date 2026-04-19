package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RideRepository extends JpaRepository<Ride, Long> {
    List<Ride> findByCustomerOrderByRequestedAtDesc(User customer);
    List<Ride> findByCustomerAndStatusIn(User customer, Collection<RideStatus> statuses);
    List<Ride> findByRiderOrderByRequestedAtDesc(User rider);
    long countByStatus(RideStatus status);
}
