package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RideRepository extends JpaRepository<Ride, Long> {
    List<Ride> findByCustomerOrderByRequestedAtDesc(User customer);
    boolean existsByCustomerAndStatusIn(User customer, Collection<RideStatus> statuses);
    List<Ride> findByCustomerAndStatusIn(User customer, Collection<RideStatus> statuses);
    List<Ride> findByRiderOrderByRequestedAtDesc(User rider);
    boolean existsByRiderAndStatusIn(User rider, Collection<RideStatus> statuses);
    Optional<Ride> findFirstByCustomerAndStatusInOrderByRequestedAtDesc(User customer, Collection<RideStatus> statuses);
    Optional<Ride> findFirstByRiderAndStatusInOrderByRequestedAtDesc(User rider, Collection<RideStatus> statuses);
    long countByStatus(RideStatus status);
    long countByStatusIn(Collection<RideStatus> statuses);
    List<Ride> findBySupportTicket(SupportTicket supportTicket);
}
