package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.RiderProfile;
import com.kituirides.api.domain.entity.Vehicle;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Provides persistence access for vehicle.
 */
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByRiderProfile(RiderProfile riderProfile);
}
