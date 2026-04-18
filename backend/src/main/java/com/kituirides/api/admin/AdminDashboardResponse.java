package com.kituirides.api.admin;

public record AdminDashboardResponse(
    long totalUsers,
    long totalRides,
    long activeRideRequests
) {
}
