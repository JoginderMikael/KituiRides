package com.kituirides.api.domain.entity;

import com.kituirides.api.domain.enums.VehicleType;
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
import lombok.Getter;
import lombok.Setter;

/**
 * Entity representing vehicle.
 */
@Getter
@Setter
@Entity
@Table(name = "vehicles")
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rider_profile_id", nullable = false)
    private RiderProfile riderProfile;

    @Column(nullable = false)
    private String make;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private String color;

    @Column(nullable = false, unique = true)
    private String plateNumber;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private VehicleType vehicleType = VehicleType.CAR;

    @Column
    private Integer engineSize;

    @Column
    private Integer yearOfManufacture;

    @Column
    private String frontPhotoUrl;

    @Column
    private String rearPhotoUrl;

    @Column
    private String interiorPhotoUrl;

    @Column
    private String insurancePhotoUrl;

    @Column
    private String chassisPhotoUrl;
}
