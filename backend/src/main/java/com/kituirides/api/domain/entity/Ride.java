package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.domain.enums.PaymentType;
import com.kituirides.api.domain.enums.DistanceSource;
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
import java.math.BigDecimal;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity representing ride.
 */
@Getter
@Setter
@Entity
@Table(name = "rides")
public class Ride {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rider_id")
    private User rider;

    @Column(nullable = false)
    private Double pickupLat;

    @Column(nullable = false)
    private Double pickupLng;

    @Column(nullable = false)
    private Double dropoffLat;

    @Column(nullable = false)
    private Double dropoffLng;

    @Column(nullable = false)
    private String pickupAddress;

    @Column(nullable = false)
    private String dropoffAddress;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal estimatedFare;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal finalFare;

    @Column(nullable = false)
    private Double surgeMultiplier = 1.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RideStatus status = RideStatus.REQUESTED;

    @Column(nullable = false)
    private Integer etaMinutes;

    @Column(nullable = false)
    private Instant requestedAt = Instant.now();

    private Instant driverAssignedAt;
    private Instant acceptedAt;
    private Instant arrivedAt;
    private Instant startedAt;
    private Instant paymentPendingAt;
    private Instant paymentCompletedAt;
    private Instant cancelledAt;
    private Instant disputedAt;
    private Instant completedAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private VehicleType vehicleType = VehicleType.CAR;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private PaymentType paymentType = PaymentType.MPESA;

    @Column(name = "distance_km", precision = 10, scale = 2)
    private BigDecimal estimatedDistanceKm;

    @Column(precision = 10, scale = 2)
    private BigDecimal chargeableDistanceKm;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private DistanceSource distanceSource = DistanceSource.ESTIMATED;

    @Column(nullable = false)
    private Boolean paymentApproved = false;

    @Column(nullable = false)
    private Boolean manualDistanceRequired = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_ticket_id")
    private SupportTicket supportTicket;

    @Column
    private Instant driverStartedAt;

    @Column
    private Instant customerCanceledAt;

    @Column(columnDefinition = "TEXT")
    private String disputeReason;
}
