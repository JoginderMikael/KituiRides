package com.kituirides.api.support;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Schedules chat auto close tasks.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatAutoCloseScheduler {

    private final ChatService chatService;

    @Scheduled(fixedDelayString = "${chat.auto-close.fixed-delay-ms:300000}")
    public void autoCloseInactiveThreads() {
        chatService.autoCloseInactiveThreads();
    }
}
