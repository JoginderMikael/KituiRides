package com.kituirides.api.chat;

/**
 * Request payload for update chat thread.
 */
public record UpdateChatThreadRequest(
    String resolutionNotes
) {
}
