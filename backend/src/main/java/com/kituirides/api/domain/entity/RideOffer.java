package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.RideOfferStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity representing ride offer.
 */
@Getter
@Setter
@Entity
@Table(name = "ride_offers")
public class RideOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_id", nullable = false)
    private Ride ride;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id", nullable = false)
    private User driver;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RideOfferStatus status = RideOfferStatus.PENDING;

    @Column(nullable = false)
    private Instant offeredAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt = Instant.now().plusSeconds(120);

    @Column
    private Instant respondedAt;
}
