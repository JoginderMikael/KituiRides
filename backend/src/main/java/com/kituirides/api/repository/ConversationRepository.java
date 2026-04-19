package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    @Query("""
        select c from Conversation c 
        where (c.participant1 = :user or c.participant2 = :user)
        and c.status = :status
        order by c.updatedAt desc
        """)
    List<Conversation> findUserConversations(@Param("user") User user, @Param("status") ConversationStatus status);

    @Query("""
        select c from Conversation c
        where (c.participant1 = :user1 and c.participant2 = :user2) 
        or (c.participant1 = :user2 and c.participant2 = :user1)
        """)
    Optional<Conversation> findConversationBetween(@Param("user1") User user1, @Param("user2") User user2);
}
