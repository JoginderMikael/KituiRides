package com.kituirides.api.support;

import com.kituirides.api.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @PostMapping("/tickets")
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(@Valid @RequestBody CreateTicketRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(supportService.createTicket(request), "Ticket created"));
    }

    @GetMapping("/tickets/me")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> myTickets() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.myTickets()));
    }

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> allTickets() {
        return ResponseEntity.ok(ApiResponse.ok(supportService.allTickets()));
    }
}
