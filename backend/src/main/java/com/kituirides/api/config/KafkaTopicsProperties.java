package com.kituirides.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.kafka.topics")
public record KafkaTopicsProperties(
    String rideEvents,
    String paymentEvents,
    String driverLocationEvents,
    String notificationEvents,
    String supportEvents,
    String analyticsEvents
) {
}
