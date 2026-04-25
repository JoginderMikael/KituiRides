package com.kituirides.api.chat.controller;

import com.kituirides.api.chat.ChatMessageResponse;
import com.kituirides.api.chat.ChatParticipantOptionResponse;
import com.kituirides.api.chat.ChatThreadResponse;
import com.kituirides.api.chat.ChatUnreadSummaryResponse;
import com.kituirides.api.chat.CreateChatThreadRequest;
import com.kituirides.api.chat.SendChatMessageRequest;
import com.kituirides.api.chat.UpdateChatThreadRequest;
import com.kituirides.api.common.ApiResponse;
import com.kituirides.api.domain.enums.ConversationStatus;
import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.support.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Collection;
import java.util.List;
import lombok.RequiredArgsConstructor;
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

/**
 * Exposes chat thread, message, participant, and unread-summary endpoints.
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Chat", description = "Chat thread, message, and participant endpoints")
@SecurityRequirement(name = "bearerAuth")
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/threads")
    @Operation(summary = "List chat threads", description = "Returns chat threads filtered by thread type, status, search term, or ride.")
    public ResponseEntity<ApiResponse<List<ChatThreadResponse>>> getThreads(
        @RequestParam(required = false) List<ConversationType> threadTypes,
        @RequestParam(required = false) ConversationStatus status,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Long rideId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getThreads(threadTypes, status, search, rideId)));
    }

    @GetMapping("/threads/{threadId}")
    @Operation(summary = "Get a chat thread", description = "Returns a single chat thread visible to the authenticated user.")
    public ResponseEntity<ApiResponse<ChatThreadResponse>> getThread(@PathVariable Long threadId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getThread(threadId)));
    }

    @GetMapping("/threads/{threadId}/messages")
    @Operation(summary = "List thread messages", description = "Returns messages for the supplied chat thread.")
    public ResponseEntity<ApiResponse<List<ChatMessageResponse>>> getMessages(@PathVariable Long threadId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getThreadMessages(threadId)));
    }

    @PostMapping("/threads")
    @Operation(summary = "Create a chat thread", description = "Creates a new chat thread between the selected participants.")
    public ResponseEntity<ApiResponse<ChatThreadResponse>> createThread(
        @Valid @RequestBody CreateChatThreadRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.createThread(request), "Thread created"));
    }

    @PostMapping("/threads/{threadId}/messages")
    @Operation(summary = "Send a chat message", description = "Adds a new message to the supplied chat thread.")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
        @PathVariable Long threadId,
        @Valid @RequestBody SendChatMessageRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            chatService.sendMessage(threadId, request.content()),
            "Message sent"
        ));
    }

    @PutMapping("/threads/{threadId}/read")
    @Operation(summary = "Mark a thread as read", description = "Updates the read state for the authenticated user in the supplied thread.")
    public ResponseEntity<ApiResponse<Void>> markThreadAsRead(@PathVariable Long threadId) {
        chatService.markThreadAsRead(threadId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Thread marked as read"));
    }

    @PutMapping("/threads/{threadId}/close")
    @Operation(summary = "Close a thread", description = "Closes the supplied thread and optionally records resolution notes.")
    public ResponseEntity<ApiResponse<ChatThreadResponse>> closeThread(
        @PathVariable Long threadId,
        @RequestBody(required = false) UpdateChatThreadRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            chatService.closeThread(threadId, request != null ? request.resolutionNotes() : null),
            "Thread closed"
        ));
    }

    @PutMapping("/threads/{threadId}/resolve")
    @Operation(summary = "Resolve a thread", description = "Marks the supplied thread as resolved and optionally stores resolution notes.")
    public ResponseEntity<ApiResponse<ChatThreadResponse>> resolveThread(
        @PathVariable Long threadId,
        @RequestBody(required = false) UpdateChatThreadRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            chatService.resolveThread(threadId, request != null ? request.resolutionNotes() : null),
            "Thread resolved"
        ));
    }

    @PutMapping("/threads/{threadId}/reopen")
    @Operation(summary = "Reopen a thread", description = "Reopens a previously resolved or closed thread.")
    public ResponseEntity<ApiResponse<ChatThreadResponse>> reopenThread(@PathVariable Long threadId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.reopenThread(threadId), "Thread reopened"));
    }

    @GetMapping("/unread-summary")
    @Operation(summary = "Get unread summary", description = "Returns unread message counters for the authenticated user.")
    public ResponseEntity<ApiResponse<ChatUnreadSummaryResponse>> unreadSummary() {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getUnreadSummary()));
    }

    @GetMapping("/participants")
    @Operation(summary = "Search chat participants", description = "Returns chat participant options filtered by role and search term.")
    public ResponseEntity<ApiResponse<List<ChatParticipantOptionResponse>>> searchParticipants(
        @RequestParam(required = false) List<Role> roles,
        @RequestParam(required = false) String search
    ) {
        Collection<Role> requestedRoles = roles == null ? List.of() : roles;
        return ResponseEntity.ok(ApiResponse.ok(chatService.searchParticipants(requestedRoles, search)));
    }
}
