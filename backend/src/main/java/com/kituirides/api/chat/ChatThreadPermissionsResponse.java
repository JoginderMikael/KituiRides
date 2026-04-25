package com.kituirides.api.chat;

/**
 * Response payload for chat thread permissions.
 */
public record ChatThreadPermissionsResponse(
    boolean canReply,
    boolean canClose,
    boolean canResolve,
    boolean canReopen
) {
}
