package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByCreatedByOrderByCreatedAtDesc(User createdBy);
}
