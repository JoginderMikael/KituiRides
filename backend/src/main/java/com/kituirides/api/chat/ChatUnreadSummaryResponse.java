package com.kituirides.api.chat;

public record ChatUnreadSummaryResponse(
    long totalUnread,
    long supportCustomerUnread,
    long supportDriverUnread,
    long supportAdminUnread
) {
}
