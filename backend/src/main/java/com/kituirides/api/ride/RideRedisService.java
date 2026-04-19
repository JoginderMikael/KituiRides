package com.kituirides.api.ride;

import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RideRedisService {

    private static final Duration ACTIVE_RIDE_TTL = Duration.ofHours(6);
    private static final Duration ACCEPT_LOCK_TTL = Duration.ofSeconds(30);

    private final StringRedisTemplate redisTemplate;

    public boolean claimCustomerActiveRide(Long customerId, Long rideId) {
        Boolean claimed = redisTemplate.opsForValue().setIfAbsent(customerKey(customerId), String.valueOf(rideId), ACTIVE_RIDE_TTL);
        return Boolean.TRUE.equals(claimed);
    }

    public void releaseCustomerActiveRide(Long customerId, Long rideId) {
        releaseIfOwned(customerKey(customerId), rideId);
    }

    public boolean claimDriverActiveRide(Long driverId, Long rideId) {
        Boolean claimed = redisTemplate.opsForValue().setIfAbsent(driverKey(driverId), String.valueOf(rideId), ACTIVE_RIDE_TTL);
        return Boolean.TRUE.equals(claimed);
    }

    public void releaseDriverActiveRide(Long driverId, Long rideId) {
        releaseIfOwned(driverKey(driverId), rideId);
    }

    public boolean acquireAcceptanceLock(Long rideId, Long driverId) {
        Boolean locked = redisTemplate.opsForValue().setIfAbsent(acceptLockKey(rideId), String.valueOf(driverId), ACCEPT_LOCK_TTL);
        return Boolean.TRUE.equals(locked);
    }

    public void releaseAcceptanceLock(Long rideId) {
        redisTemplate.delete(acceptLockKey(rideId));
    }

    private void releaseIfOwned(String key, Long rideId) {
        String currentValue = redisTemplate.opsForValue().get(key);
        if (String.valueOf(rideId).equals(currentValue)) {
            redisTemplate.delete(key);
        }
    }

    private String customerKey(Long customerId) {
        return "ride:active:customer:" + customerId;
    }

    private String driverKey(Long driverId) {
        return "ride:active:driver:" + driverId;
    }

    private String acceptLockKey(Long rideId) {
        return "ride:accept-lock:" + rideId;
    }
}
