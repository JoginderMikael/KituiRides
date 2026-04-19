package com.kituirides.api.chat;

import jakarta.validation.constraints.NotBlank;

public record SendChatMessageRequest(
    @NotBlank String content
) {
}
