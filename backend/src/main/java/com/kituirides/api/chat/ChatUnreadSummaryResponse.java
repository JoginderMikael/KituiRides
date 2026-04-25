package com.kituirides.api.chat;

/**
 * Response payload for chat unread summary.
 */
public record ChatUnreadSummaryResponse(
    long totalUnread,
    long supportCustomerUnread,
    long supportDriverUnread,
    long supportAdminUnread
) {
}
