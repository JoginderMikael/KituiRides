package com.kituirides.api.kafka.consumer;

import com.kituirides.api.config.KafkaTopicsProperties;
import com.kituirides.api.event.analytics.AnalyticsEvent;
import com.kituirides.api.service.AnalyticsEventService;
import com.kituirides.api.service.EventIdempotencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.kafka", name = "enabled", havingValue = "true")
public class AnalyticsEventConsumer {

    private final KafkaTopicsProperties topics;
    private final EventIdempotencyService idempotencyService;
    private final AnalyticsEventService analyticsEventService;

    @KafkaListener(topics = "${app.kafka.topics.analytics-events}")
    public void consume(AnalyticsEvent event) {
        if (!idempotencyService.markProcessingStarted(event, topics.analyticsEvents())) {
            return;
        }
        log.info("Event consumed: topic={}, eventId={}, eventType={}, metric={}", topics.analyticsEvents(), event.getEventId(), event.getEventType(), event.getMetricName());
        analyticsEventService.record(event);
    }
}
