package com.kituirides.api.service;

import com.kituirides.api.domain.entity.ProcessedEvent;
import com.kituirides.api.event.BaseEvent;
import com.kituirides.api.repository.ProcessedEventRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EventIdempotencyService {

    private final ProcessedEventRepository processedEventRepository;

    @Transactional
    public boolean markProcessingStarted(BaseEvent event, String topic) {
        if (event == null || event.getEventId() == null) {
            return false;
        }
        if (processedEventRepository.existsByEventId(event.getEventId())) {
            log.info("Duplicate Kafka event skipped: eventId={}, eventType={}", event.getEventId(), event.getEventType());
            return false;
        }

        ProcessedEvent processedEvent = new ProcessedEvent();
        processedEvent.setEventId(event.getEventId());
        processedEvent.setEventType(event.getEventType().name());
        processedEvent.setTopic(topic);
        processedEvent.setProcessedAt(Instant.now());
        try {
            processedEventRepository.save(processedEvent);
            return true;
        } catch (DataIntegrityViolationException exception) {
            log.info("Duplicate Kafka event skipped after unique constraint: eventId={}", event.getEventId());
            return false;
        }
    }
}
