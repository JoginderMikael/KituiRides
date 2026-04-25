package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Rating;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Provides persistence access for rating.
 */
public interface RatingRepository extends JpaRepository<Rating, Long> {
    List<Rating> findByRide(Ride ride);
    List<Rating> findByCustomerOrRider(User customer, User rider);
}
