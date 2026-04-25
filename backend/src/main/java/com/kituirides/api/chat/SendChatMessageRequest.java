package com.kituirides.api.chat;

import jakarta.validation.constraints.NotBlank;

/**
 * Request payload for send chat message.
 */
public record SendChatMessageRequest(
    @NotBlank String content
) {
}
