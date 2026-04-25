package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Provides persistence access for message.
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(Long conversationId);
    Optional<Message> findTopByConversationIdOrderByCreatedAtDesc(Long conversationId);
    void deleteByConversationIn(List<Conversation> conversations);

    @Query("""
        select count(m) from Message m
        where m.conversation = :conversation
          and (m.sender is null or m.sender.id <> :userId)
          and not exists (
            select 1 from MessageReadState rs
            where rs.message = m
              and rs.user.id = :userId
          )
        """)
    Long countUnreadMessages(@Param("conversation") Conversation conversation, @Param("userId") Long userId);

    @Query("""
        select m from Message m
        where m.conversation = :conversation
          and (m.sender is null or m.sender.id <> :userId)
          and not exists (
            select 1 from MessageReadState rs
            where rs.message = m
              and rs.user.id = :userId
          )
        """)
    List<Message> findUnreadMessages(@Param("conversation") Conversation conversation, @Param("userId") Long userId);
}
