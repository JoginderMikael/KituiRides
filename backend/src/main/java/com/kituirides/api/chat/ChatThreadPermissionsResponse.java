package com.kituirides.api.chat;

public record ChatThreadPermissionsResponse(
    boolean canReply,
    boolean canClose,
    boolean canResolve,
    boolean canReopen
) {
}
