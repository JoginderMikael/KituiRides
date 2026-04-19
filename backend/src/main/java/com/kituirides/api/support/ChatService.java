package com.kituirides.api.support;

import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationStatus;
import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.repository.ConversationRepository;
import com.kituirides.api.repository.MessageRepository;
import com.kituirides.api.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    /**
     * Get or create conversation between two users for a ride
     */
    @Transactional
    public Conversation getOrCreateRideConversation(Ride ride) {
        // Check if conversation already exists
        Conversation existing = conversationRepository.findConversationBetween(ride.getCustomer(), ride.getRider())
                .orElse(null);

        if (existing != null) {
            return existing;
        }

        // Create new conversation
        Conversation conversation = new Conversation();
        conversation.setRide(ride);
        conversation.setParticipant1(ride.getCustomer());
        conversation.setParticipant2(ride.getRider());
        conversation.setConversationType(ConversationType.RIDE_CHAT);
        conversation.setStatus(ConversationStatus.ACTIVE);
        conversation.setCreatedAt(Instant.now());
        conversation.setUpdatedAt(Instant.now());

        conversation = conversationRepository.save(conversation);
        log.info("Created ride conversation {} for ride {}", conversation.getId(), ride.getId());
        return conversation;
    }

    /**
     * Get or create support conversation between customer and support agent
     */
    @Transactional
    public Conversation getOrCreateSupportConversation(User customer, User supportAgent) {
        Conversation existing = conversationRepository.findConversationBetween(customer, supportAgent)
                .orElse(null);

        if (existing != null && existing.getConversationType() == ConversationType.SUPPORT_CHAT) {
            return existing;
        }

        Conversation conversation = new Conversation();
        conversation.setParticipant1(customer);
        conversation.setParticipant2(supportAgent);
        conversation.setConversationType(ConversationType.SUPPORT_CHAT);
        conversation.setSupportAgent(supportAgent);
        conversation.setStatus(ConversationStatus.ACTIVE);
        conversation.setCreatedAt(Instant.now());
        conversation.setUpdatedAt(Instant.now());

        conversation = conversationRepository.save(conversation);
        log.info("Created support conversation {} between customer {} and agent {}", 
                conversation.getId(), customer.getId(), supportAgent.getId());
        return conversation;
    }

    /**
     * Send message in conversation
     */
    @Transactional
    public Message sendMessage(Long conversationId, Long senderId, String content) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message.setIsRead(false);
        message.setCreatedAt(Instant.now());

        message = messageRepository.save(message);
        
        // Update conversation's updatedAt timestamp
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
        
        log.info("Message {} sent in conversation {} by user {}", message.getId(), conversationId, senderId);
        return message;
    }

    /**
     * Get messages for a conversation
     */
    public List<Message> getConversationMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);
    }

    /**
     * Mark message as read
     */
    @Transactional
    public void markMessageAsRead(Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));
        message.setIsRead(true);
        messageRepository.save(message);
    }

    /**
     * Mark all messages as read in conversation
     */
    @Transactional
    public void markConversationAsRead(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        messageRepository.markAllAsRead(conversation);
    }

    /**
     * Get unread message count for a conversation
     */
    public Long getUnreadMessageCount(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        return messageRepository.countUnreadMessages(conversation);
    }

    /**
     * Get user's active conversations
     */
    public List<Conversation> getUserConversations(User user) {
        return conversationRepository.findUserConversations(user, ConversationStatus.ACTIVE);
    }

    /**
     * Close conversation
     */
    @Transactional
    public void closeConversation(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        conversation.setStatus(ConversationStatus.CLOSED);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
        log.info("Closed conversation {}", conversationId);
    }

    /**
     * Archive conversation
     */
    @Transactional
    public void archiveConversation(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));
        conversation.setStatus(ConversationStatus.ARCHIVED);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
        log.info("Archived conversation {}", conversationId);
    }
}
