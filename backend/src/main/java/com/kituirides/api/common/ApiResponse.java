package com.kituirides.api.common;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Standard API response wrapper returned by REST endpoints.
 */
@Schema(description = "Standard API response envelope.")
public record ApiResponse<T>(
    @Schema(description = "Indicates whether the request succeeded.")
    boolean success,
    @Schema(description = "Response payload returned by the endpoint.")
    T data,
    @Schema(description = "Optional human-readable result message.")
    String message
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static <T> ApiResponse<T> ok(T data, String message) {
        return new ApiResponse<>(true, data, message);
    }

    public static ApiResponse<Void> fail(String message) {
        return new ApiResponse<>(false, null, message);
    }
}
