package com.kituirides.api.chat.controller;

import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.JwtTokenProvider;
import com.kituirides.api.support.ChatService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ChatController {

    private final ChatService chatService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    /**
     * Get user's conversations
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<Conversation>> getConversations(@RequestHeader("Authorization") String token) {
        Long userId = extractUserIdFromToken(token);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Conversation> conversations = chatService.getUserConversations(user);
        return ResponseEntity.ok(conversations);
    }

    /**
     * Get messages for a conversation
     */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<Message>> getMessages(@PathVariable Long conversationId) {
        List<Message> messages = chatService.getConversationMessages(conversationId);
        return ResponseEntity.ok(messages);
    }

    /**
     * Send message in conversation
     */
    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<Message> sendMessage(
            @PathVariable Long conversationId,
            @RequestHeader("Authorization") String token,
            @RequestBody SendMessageRequest request) {
        
        Long senderId = extractUserIdFromToken(token);
        Message message = chatService.sendMessage(conversationId, senderId, request.getContent());
        
        return ResponseEntity.ok(message);
    }

    /**
     * Mark message as read
     */
    @PutMapping("/messages/{messageId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long messageId) {
        chatService.markMessageAsRead(messageId);
        return ResponseEntity.ok().build();
    }

    /**
     * Mark all messages in conversation as read
     */
    @PutMapping("/conversations/{conversationId}/read")
    public ResponseEntity<Void> markConversationAsRead(@PathVariable Long conversationId) {
        chatService.markConversationAsRead(conversationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Get unread message count
     */
    @GetMapping("/conversations/{conversationId}/unread-count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long conversationId) {
        Long count = chatService.getUnreadMessageCount(conversationId);
        return ResponseEntity.ok(count);
    }

    /**
     * Close conversation
     */
    @PutMapping("/conversations/{conversationId}/close")
    public ResponseEntity<Void> closeConversation(@PathVariable Long conversationId) {
        chatService.closeConversation(conversationId);
        return ResponseEntity.ok().build();
    }

    /**
     * Extract user ID from JWT token
     */
    private Long extractUserIdFromToken(String token) {
        String jwt = token.replace("Bearer ", "");
        return jwtTokenProvider.getUserIdFromToken(jwt);
    }

    // DTO
    public static class SendMessageRequest {
        private String content;

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
