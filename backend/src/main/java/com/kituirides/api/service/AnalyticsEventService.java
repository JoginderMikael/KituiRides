package com.kituirides.api.service;

import com.kituirides.api.event.analytics.AnalyticsEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class AnalyticsEventService {

    public void record(AnalyticsEvent event) {
        log.info(
            "Analytics event recorded: eventId={}, type={}, metric={}, amount={}",
            event.getEventId(),
            event.getEventType(),
            event.getMetricName(),
            event.getAmount()
        );
    }
}
