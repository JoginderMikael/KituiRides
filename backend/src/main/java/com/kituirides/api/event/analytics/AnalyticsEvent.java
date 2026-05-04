package com.kituirides.api.event.analytics;

import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.kituirides.api.event.BaseEvent;
import com.kituirides.api.event.EventType;
import java.math.BigDecimal;
import java.util.Map;

@JsonAutoDetect(fieldVisibility = JsonAutoDetect.Visibility.ANY)
public class AnalyticsEvent extends BaseEvent {
    private String metricName;
    private BigDecimal amount;
    private Map<String, Object> attributes;

    public AnalyticsEvent() {
    }

    public AnalyticsEvent(EventType eventType, Long userId, Long rideId, String metricName, BigDecimal amount, Map<String, Object> attributes) {
        super(eventType, userId, rideId, rideId != null ? "ride-" + rideId : null);
        this.metricName = metricName;
        this.amount = amount;
        this.attributes = attributes;
    }

    public String getMetricName() {
        return metricName;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public Map<String, Object> getAttributes() {
        return attributes;
    }
}
