package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.SupportTicketReply;
import com.kituirides.api.domain.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Provides persistence access for support ticket reply.
 */
public interface SupportTicketReplyRepository extends JpaRepository<SupportTicketReply, Long> {
    List<SupportTicketReply> findByTicketOrderByCreatedAtAsc(SupportTicket ticket);
    List<SupportTicketReply> findByAuthor(User author);
    void deleteByTicketIn(List<SupportTicket> tickets);
}
