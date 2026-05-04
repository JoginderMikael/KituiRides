package com.kituirides.api.event.ride;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.kituirides.api.domain.enums.RideStatus;
import com.kituirides.api.domain.enums.VehicleType;
import com.kituirides.api.event.BaseEvent;
import com.kituirides.api.event.EventType;
import java.math.BigDecimal;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class RideEvent extends BaseEvent {
    private Long customerId;
    private Long driverId;
    private Double pickupLat;
    private Double pickupLng;
    private Double dropoffLat;
    private Double dropoffLng;
    private VehicleType vehicleType;
    private BigDecimal fare;
    private RideStatus status;

    public RideEvent() {
    }

    public RideEvent(
        EventType eventType,
        Long rideId,
        Long customerId,
        Long driverId,
        Double pickupLat,
        Double pickupLng,
        Double dropoffLat,
        Double dropoffLng,
        VehicleType vehicleType,
        BigDecimal fare,
        RideStatus status
    ) {
        super(eventType, customerId, rideId, rideId != null ? "ride-" + rideId : null);
        this.customerId = customerId;
        this.driverId = driverId;
        this.pickupLat = pickupLat;
        this.pickupLng = pickupLng;
        this.dropoffLat = dropoffLat;
        this.dropoffLng = dropoffLng;
        this.vehicleType = vehicleType;
        this.fare = fare;
        this.status = status;
    }

    public Long getCustomerId() {
        return customerId;
    }

    public Long getDriverId() {
        return driverId;
    }

    public Double getPickupLat() {
        return pickupLat;
    }

    public Double getPickupLng() {
        return pickupLng;
    }

    public Double getDropoffLat() {
        return dropoffLat;
    }

    public Double getDropoffLng() {
        return dropoffLng;
    }

    public VehicleType getVehicleType() {
        return vehicleType;
    }

    public BigDecimal getFare() {
        return fare;
    }

    public RideStatus getStatus() {
        return status;
    }
}
