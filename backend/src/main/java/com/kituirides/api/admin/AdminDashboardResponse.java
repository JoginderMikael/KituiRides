package com.kituirides.api.admin;

/**
 * Response payload for admin dashboard.
 */
public record AdminDashboardResponse(
    long totalUsers,
    long totalRides,
    long activeRideRequests
) {
}
