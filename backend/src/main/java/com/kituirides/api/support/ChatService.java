package com.kituirides.api.support;

import com.kituirides.api.chat.ChatConversationResponse;
import com.kituirides.api.chat.ChatMessageResponse;
import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationStatus;
import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.repository.ConversationRepository;
import com.kituirides.api.repository.MessageRepository;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final CurrentUserService currentUserService;
    private final RealtimePublisher realtimePublisher;

    /**
     * Get or create conversation between two users for a ride
     */
    @Transactional
    public Conversation getOrCreateRideConversation(Ride ride) {
        Conversation existing = conversationRepository.findRideConversation(
            ride,
            ConversationType.RIDE_CHAT,
            ride.getCustomer(),
            ride.getRider()
        ).orElse(null);

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
     * Get or create support conversation between a ride participant and support agent
     */
    @Transactional
    public Conversation getOrCreateSupportConversation(Ride ride, User participant, User supportAgent) {
        Conversation existing = conversationRepository.findRideConversation(
            ride,
            ConversationType.SUPPORT_CHAT,
            participant,
            supportAgent
        ).orElse(null);

        if (existing != null) {
            return existing;
        }

        Conversation conversation = new Conversation();
        conversation.setRide(ride);
        conversation.setParticipant1(participant);
        conversation.setParticipant2(supportAgent);
        conversation.setConversationType(ConversationType.SUPPORT_CHAT);
        conversation.setSupportAgent(supportAgent);
        conversation.setStatus(ConversationStatus.ACTIVE);
        conversation.setCreatedAt(Instant.now());
        conversation.setUpdatedAt(Instant.now());

        conversation = conversationRepository.save(conversation);
        log.info("Created support conversation {} for ride {} between participant {} and agent {}",
            conversation.getId(), ride.getId(), participant.getId(), supportAgent.getId());
        return conversation;
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long conversationId, String content) {
        User sender = currentUserService.getCurrentUser();
        Conversation conversation = getAccessibleConversation(conversationId, sender);

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message.setIsRead(false);
        message.setCreatedAt(Instant.now());

        message = messageRepository.save(message);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);

        ChatMessageResponse response = toMessageResponse(message);
        realtimePublisher.publishConversationUpdate(conversationId, "MESSAGE_SENT", response);
        log.info("Message {} sent in conversation {} by user {}", message.getId(), conversationId, sender.getId());
        return response;
    }

    public List<ChatMessageResponse> getConversationMessages(Long conversationId) {
        User currentUser = currentUserService.getCurrentUser();
        getAccessibleConversation(conversationId, currentUser);
        return messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId).stream()
            .map(this::toMessageResponse)
            .toList();
    }

    public List<ChatConversationResponse> getCurrentUserConversations(Long rideId) {
        User currentUser = currentUserService.getCurrentUser();
        return conversationRepository.findUserConversations(currentUser, ConversationStatus.ACTIVE).stream()
            .filter(conversation -> rideId == null || (conversation.getRide() != null && rideId.equals(conversation.getRide().getId())))
            .map(conversation -> toConversationResponse(conversation, currentUser))
            .toList();
    }

    @Transactional
    public void markConversationAsRead(Long conversationId) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation conversation = getAccessibleConversation(conversationId, currentUser);
        messageRepository.markAllAsRead(conversation);
        realtimePublisher.publishConversationUpdate(conversationId, "CONVERSATION_READ", null);
    }

    @Transactional
    public void closeConversation(Long conversationId) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation conversation = getAccessibleConversation(conversationId, currentUser);
        conversation.setStatus(ConversationStatus.CLOSED);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
        log.info("Closed conversation {}", conversationId);
    }

    @Transactional
    public void archiveConversation(Long conversationId) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation conversation = getAccessibleConversation(conversationId, currentUser);
        conversation.setStatus(ConversationStatus.ARCHIVED);
        conversation.setUpdatedAt(Instant.now());
        conversationRepository.save(conversation);
        log.info("Archived conversation {}", conversationId);
    }

    private Conversation getAccessibleConversation(Long conversationId, User currentUser) {
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));
        boolean participant = conversation.getParticipant1().getId().equals(currentUser.getId())
            || conversation.getParticipant2().getId().equals(currentUser.getId());
        if (!participant) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Conversation does not belong to the current user");
        }
        return conversation;
    }

    private ChatConversationResponse toConversationResponse(Conversation conversation, User currentUser) {
        User participant = conversation.getParticipant1().getId().equals(currentUser.getId())
            ? conversation.getParticipant2()
            : conversation.getParticipant1();
        User supportAgent = conversation.getSupportAgent();
        return new ChatConversationResponse(
            conversation.getId(),
            conversation.getRide() != null ? conversation.getRide().getId() : null,
            conversation.getConversationType(),
            participant.getId(),
            participant.getFirstName() + " " + participant.getLastName(),
            participant.getPhoneNumber(),
            supportAgent != null ? supportAgent.getId() : null,
            supportAgent != null ? supportAgent.getFirstName() + " " + supportAgent.getLastName() : null,
            supportAgent != null ? supportAgent.getPhoneNumber() : null,
            messageRepository.countUnreadMessages(conversation),
            conversation.getUpdatedAt()
        );
    }

    private ChatMessageResponse toMessageResponse(Message message) {
        User sender = message.getSender();
        return new ChatMessageResponse(
            message.getId(),
            message.getContent(),
            message.getIsRead(),
            message.getCreatedAt(),
            sender.getId(),
            sender.getFirstName() + " " + sender.getLastName(),
            sender.getPhoneNumber(),
            sender.getRole()
        );
    }
}
