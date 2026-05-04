package com.kituirides.api.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaAdmin;

@Configuration
@EnableConfigurationProperties(KafkaTopicsProperties.class)
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class KafkaTopicConfig {

    @Bean
    KafkaAdmin.NewTopics kafkaTopics(KafkaTopicsProperties topics) {
        return new KafkaAdmin.NewTopics(
            topic(topics.rideEvents()),
            topic(topics.paymentEvents()),
            topic(topics.driverLocationEvents()),
            topic(topics.notificationEvents()),
            topic(topics.supportEvents()),
            topic(topics.analyticsEvents()),
            topic(topics.rideEvents() + ".DLT"),
            topic(topics.paymentEvents() + ".DLT"),
            topic(topics.driverLocationEvents() + ".DLT"),
            topic(topics.notificationEvents() + ".DLT"),
            topic(topics.supportEvents() + ".DLT"),
            topic(topics.analyticsEvents() + ".DLT")
        );
    }

    private NewTopic topic(String name) {
        return TopicBuilder.name(name).partitions(3).replicas(1).build();
    }
}
