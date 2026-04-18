package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.SupportTicketReply;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupportTicketReplyRepository extends JpaRepository<SupportTicketReply, Long> {
    List<SupportTicketReply> findByTicketOrderByCreatedAtAsc(SupportTicket ticket);
}
