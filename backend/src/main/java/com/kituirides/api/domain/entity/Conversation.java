package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.ConversationStatus;
import com.kituirides.api.domain.enums.ConversationType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Entity representing conversation.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "conversations")
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id")
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_ticket_id")
    private SupportTicket supportTicket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant1_id", nullable = false)
    private User participant1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant2_id", nullable = false)
    private User participant2;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ConversationType conversationType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_agent_id")
    private User supportAgent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ConversationStatus status = ConversationStatus.OPEN;

    @Column(length = 255)
    private String subject;

    @OneToMany(mappedBy = "conversation", fetch = FetchType.LAZY)
    private List<Message> messages = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @Column
    private Instant lastMessageAt = Instant.now();

    @Column
    private Instant closedAt;

    @Column
    private Instant autoClosedAt;
}
