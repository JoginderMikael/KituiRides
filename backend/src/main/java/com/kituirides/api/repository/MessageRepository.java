package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId);

    @Query("""
        select count(m) from Message m
        where m.conversation = :conversation and m.isRead = false
        """)
    Long countUnreadMessages(@Param("conversation") Conversation conversation);

    @Query("""
        update Message m set m.isRead = true
        where m.conversation = :conversation
        """)
    @Modifying
    void markAllAsRead(@Param("conversation") Conversation conversation);
}
