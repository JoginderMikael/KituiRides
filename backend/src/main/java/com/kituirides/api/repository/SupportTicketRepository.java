package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.TicketType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByCreatedByOrderByCreatedAtDesc(User createdBy);
    List<SupportTicket> findByAssignedToOrAssignedToIsNullOrderByCreatedAtDesc(User assignedTo);
    Optional<SupportTicket> findFirstByRideIdAndTicketTypeOrderByCreatedAtDesc(Long rideId, TicketType ticketType);
}
