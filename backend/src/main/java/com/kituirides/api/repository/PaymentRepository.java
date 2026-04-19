package com.kituirides.api.repository;

import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.Ride;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRide(Ride ride);
    Optional<Payment> findByTransactionRef(String transactionRef);
    Optional<Payment> findByProviderCheckoutRequestId(String providerCheckoutRequestId);
    Optional<Payment> findByProviderMerchantRequestId(String providerMerchantRequestId);

    @Query("""
        select coalesce(sum(p.amount), 0)
        from Payment p
        where p.ride.rider.id = :riderId and p.status = com.kituirides.api.domain.enums.PaymentStatus.SUCCESS
        """)
    BigDecimal totalSuccessfulEarningsByRider(@Param("riderId") Long riderId);
}
