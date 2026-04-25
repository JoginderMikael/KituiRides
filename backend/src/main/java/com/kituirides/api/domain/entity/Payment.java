package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.PaymentStatus;
import com.kituirides.api.domain.enums.PaymentType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity representing payment.
 */
@Getter
@Setter
@Entity
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false, unique = true)
    private Ride ride;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(unique = true)
    private String transactionRef;

    @Column
    private String providerCheckoutRequestId;

    @Column
    private String providerMerchantRequestId;

    @Column
    private String providerReceiptNumber;

    @Column
    private String providerResponseCode;

    @Column(columnDefinition = "TEXT")
    private String providerResponseDescription;

    @Column(columnDefinition = "TEXT")
    private String callbackPayload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentType paymentType = PaymentType.MPESA;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column
    private Instant completedAt;
}
