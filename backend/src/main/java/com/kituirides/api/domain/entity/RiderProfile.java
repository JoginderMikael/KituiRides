package com.kituirides.api.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity representing rider profile.
 */
@Getter
@Setter
@Entity
@Table(name = "rider_profiles")
public class RiderProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, unique = true)
    private String licenseNumber;

    @Column(unique = true)
    private String idNumber;

    @Column
    private String passportPhotoUrl;

    @Column
    private Boolean isOwner = true;

    @Column(nullable = false)
    private Boolean verified = false;

    @Column(nullable = false)
    private Boolean available = false;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalEarnings = BigDecimal.ZERO;
}
