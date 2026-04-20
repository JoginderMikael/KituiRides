package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationStatus;
import com.kituirides.api.domain.enums.ConversationType;
import java.time.Instant;
import java.util.Collection;
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
        left join fetch c.supportTicket t
        left join fetch c.participant1
        left join fetch c.participant2
        left join fetch c.supportAgent
        where c.conversationType in :conversationTypes
          and (
            c.participant1 = :user
            or c.participant2 = :user
            or c.supportAgent = :user
            or t.assignedTo = :user
          )
        order by coalesce(c.lastMessageAt, c.updatedAt, c.createdAt) desc
        """)
    List<Conversation> findAccessibleThreads(
        @Param("user") User user,
        @Param("conversationTypes") Collection<ConversationType> conversationTypes
    );

    @Query("""
        select c from Conversation c
        left join fetch c.supportTicket t
        left join fetch c.participant1
        left join fetch c.participant2
        left join fetch c.supportAgent
        where c.conversationType in :conversationTypes
        order by coalesce(c.lastMessageAt, c.updatedAt, c.createdAt) desc
        """)
    List<Conversation> findVisibleThreadsByType(
        @Param("conversationTypes") Collection<ConversationType> conversationTypes
    );

    @Query("""
        select c from Conversation c
        where (c.participant1 = :user1 and c.participant2 = :user2) 
        or (c.participant1 = :user2 and c.participant2 = :user1)
        """)
    Optional<Conversation> findConversationBetween(@Param("user1") User user1, @Param("user2") User user2);

    Optional<Conversation> findByRide_IdAndConversationType(Long rideId, ConversationType conversationType);

    @Query("""
        select c from Conversation c
        where c.ride = :ride
          and c.conversationType = :conversationType
          and (
            (c.participant1 = :user1 and c.participant2 = :user2)
            or (c.participant1 = :user2 and c.participant2 = :user1)
          )
        """)
    Optional<Conversation> findRideConversation(
        @Param("ride") com.kituirides.api.domain.entity.Ride ride,
        @Param("conversationType") ConversationType conversationType,
        @Param("user1") User user1,
        @Param("user2") User user2
    );

    List<Conversation> findByRide(Ride ride);

    List<Conversation> findByParticipant1OrParticipant2OrSupportAgent(User participant1, User participant2, User supportAgent);

    List<Conversation> findBySupportTicket_Id(Long supportTicketId);

    @Query("""
        select c from Conversation c
        where c.conversationType in :conversationTypes
          and c.status in :statuses
          and coalesce(c.lastMessageAt, c.updatedAt, c.createdAt) <= :cutoff
        """)
    List<Conversation> findThreadsEligibleForAutoClose(
        @Param("conversationTypes") Collection<ConversationType> conversationTypes,
        @Param("statuses") Collection<ConversationStatus> statuses,
        @Param("cutoff") Instant cutoff
    );
}
