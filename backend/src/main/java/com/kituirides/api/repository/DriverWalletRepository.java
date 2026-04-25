package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.DriverWallet;
import com.kituirides.api.domain.entity.RiderProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Provides persistence access for driver wallet.
 */
@Repository
public interface DriverWalletRepository extends JpaRepository<DriverWallet, Long> {
    Optional<DriverWallet> findByDriver(RiderProfile driver);
    Optional<DriverWallet> findByDriver_Id(Long driverId);
    Optional<DriverWallet> findByDriver_User_Id(Long userId);
}
