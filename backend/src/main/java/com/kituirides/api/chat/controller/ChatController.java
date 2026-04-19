package com.kituirides.api.chat.controller;

import com.kituirides.api.chat.ChatConversationResponse;
import com.kituirides.api.chat.ChatMessageResponse;
import com.kituirides.api.chat.SendChatMessageRequest;
import com.kituirides.api.common.ApiResponse;
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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ChatConversationResponse>>> getConversations(
        @RequestParam(required = false) Long rideId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getCurrentUserConversations(rideId)));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(@PathVariable Long conversationId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getConversationMessages(conversationId)));
    }

    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @PathVariable Long conversationId,
            @RequestBody SendChatMessageRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
            chatService.sendMessage(conversationId, request.content()),
            "Message sent"
        ));
    }

    @PutMapping("/conversations/{conversationId}/read")
    public ResponseEntity<ApiResponse<Void>> markConversationAsRead(@PathVariable Long conversationId) {
        chatService.markConversationAsRead(conversationId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Conversation marked as read"));
    }

    @PutMapping("/conversations/{conversationId}/close")
    public ResponseEntity<ApiResponse<Void>> closeConversation(@PathVariable Long conversationId) {
        chatService.closeConversation(conversationId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Conversation closed"));
    }
}
