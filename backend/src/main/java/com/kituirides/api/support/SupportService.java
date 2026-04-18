package com.kituirides.api.support;

import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.repository.SupportTicketRepository;
import com.kituirides.api.security.CurrentUserService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupportService {

    private final SupportTicketRepository supportTicketRepository;
    private final CurrentUserService currentUserService;

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request) {
        var user = currentUserService.getCurrentUser();
        SupportTicket ticket = new SupportTicket();
        ticket.setCreatedBy(user);
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        return toResponse(supportTicketRepository.save(ticket));
    }

    public List<TicketResponse> myTickets() {
        var user = currentUserService.getCurrentUser();
        return supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(user)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    public List<TicketResponse> allTickets() {
        return supportTicketRepository.findAll().stream().map(this::toResponse).toList();
    }

    private TicketResponse toResponse(SupportTicket ticket) {
        return new TicketResponse(
            ticket.getId(),
            ticket.getCreatedBy().getId(),
            ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
            ticket.getSubject(),
            ticket.getDescription(),
            ticket.getStatus(),
            ticket.getCreatedAt()
        );
    }
}
