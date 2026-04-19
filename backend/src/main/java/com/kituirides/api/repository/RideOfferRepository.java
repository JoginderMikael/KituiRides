package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.RideOffer;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.RideOfferStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RideOfferRepository extends JpaRepository<RideOffer, Long> {
    List<RideOffer> findByRideOrderByOfferedAtAsc(Ride ride);
    List<RideOffer> findByRideAndStatusOrderByOfferedAtAsc(Ride ride, RideOfferStatus status);
    Optional<RideOffer> findByRideAndDriver(Ride ride, User driver);
    List<RideOffer> findByDriverAndStatusOrderByOfferedAtDesc(User driver, RideOfferStatus status);
    List<RideOffer> findByStatusAndExpiresAtBefore(RideOfferStatus status, Instant expiresAt);
}
