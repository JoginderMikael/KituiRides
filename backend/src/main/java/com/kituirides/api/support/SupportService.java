package com.kituirides.api.support;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Payment;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.SupportTicketReply;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.TicketType;
import com.kituirides.api.repository.SupportTicketReplyRepository;
import com.kituirides.api.repository.SupportTicketRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SupportService {

    private final SupportTicketRepository supportTicketRepository;
    private final SupportTicketReplyRepository supportTicketReplyRepository;
    private final com.kituirides.api.security.CurrentUserService currentUserService;
    private final RideService rideService;
    private final com.kituirides.api.payment.PaymentService paymentService;
    private final UserRepository userRepository;
    private final ChatService chatService;
    private final com.kituirides.api.admin.AdminSettingsService adminSettingsService;

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request) {
        var user = currentUserService.getCurrentUser();
        SupportTicket ticket = new SupportTicket();
        ticket.setCreatedBy(user);
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        ticket.setTicketType(request.ticketType() != null ? request.ticketType() : TicketType.GENERAL);
        ticket.setRideId(request.rideId());
        return toResponse(supportTicketRepository.save(ticket));
    }

    public List<TicketResponse> myTickets() {
        var user = currentUserService.getCurrentUser();
        return supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(user).stream()
            .map(this::toResponse)
            .toList();
    }

    public List<TicketResponse> assignedOrOpenTicketsForAgent() {
        var agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        return supportTicketRepository.findByAssignedToOrAssignedToIsNullOrderByCreatedAtDesc(agent).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public TicketResponse replyToTicket(Long ticketId, TicketReplyRequest request) {
        var agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        SupportTicket ticket = getTicket(ticketId);
        if (ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(agent);
        }
        SupportTicketReply reply = new SupportTicketReply();
        reply.setTicket(ticket);
        reply.setAuthor(agent);
        reply.setMessage(request.message());
        supportTicketReplyRepository.save(reply);
        supportTicketRepository.save(ticket);
        return toResponse(ticket);
    }

    @Transactional
    public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest request) {
        var agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        SupportTicket ticket = getTicket(ticketId);
        if (ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(agent);
        }
        ticket.setStatus(request.status());
        if (request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        return toResponse(supportTicketRepository.save(ticket));
    }

    @Transactional
    public RideResponse raiseRideDispute(Long rideId, String reason) {
        var actor = currentUserService.getCurrentUser();
        var ride = rideService.getRideById(rideId);
        boolean participant = ride.getCustomer().getId().equals(actor.getId())
            || (ride.getRider() != null && ride.getRider().getId().equals(actor.getId()))
            || actor.getRole() == Role.ADMIN
            || actor.getRole() == Role.SUPPORT_AGENT;
        if (!participant) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not allowed to dispute this ride");
        }

        User supportAgent = findSupportAgent();
        SupportTicket ticket = new SupportTicket();
        ticket.setCreatedBy(actor);
        ticket.setAssignedTo(supportAgent);
        ticket.setSubject("Ride dispute #" + rideId);
        ticket.setDescription(reason);
        ticket.setTicketType(TicketType.DISPUTE);
        ticket.setRideId(rideId);
        ticket = supportTicketRepository.save(ticket);

        chatService.getOrCreateSupportConversation(ride, ride.getCustomer(), supportAgent);
        if (ride.getRider() != null) {
            chatService.getOrCreateSupportConversation(ride, ride.getRider(), supportAgent);
        }
        return rideService.markDisputed(rideId, ticket, reason);
    }

    public RideResponse getRide(Long rideId) {
        ensureSupportActor(currentUserService.getCurrentUser());
        return rideService.rideById(rideId);
    }

    @Transactional
    public RideResponse fixRideKms(Long rideId, BigDecimal newKms) {
        ensureSupportActor(currentUserService.getCurrentUser());
        return rideService.supportOverrideDistance(rideId, newKms);
    }

    @Transactional
    public RideResponse resolveRide(Long rideId, ResolveRideRequest request) {
        var agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        SupportTicket ticket = supportTicketRepository.findFirstByRideIdAndTicketTypeOrderByCreatedAtDesc(rideId, TicketType.DISPUTE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispute ticket not found for this ride"));
        ticket.setAssignedTo(ticket.getAssignedTo() != null ? ticket.getAssignedTo() : agent);
        ticket.setStatus(com.kituirides.api.domain.enums.TicketStatus.RESOLVED);
        if (request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        supportTicketRepository.save(ticket);
        return rideService.resolveDispute(rideId, request.resolvedDistanceKm());
    }

    @Transactional
    public RideResponse forceApprovePayment(Long rideId) {
        ensureSupportActor(currentUserService.getCurrentUser());
        paymentService.forceApprovePayment(rideId);
        return rideService.rideById(rideId);
    }

    public SupportContactResponse getSupportContact() {
        var supportSettings = adminSettingsService.getSupportSettings();
        return new SupportContactResponse(
            supportSettings.supportPhoneNumber(),
            supportSettings.supportEmailAddress(),
            supportSettings.supportHelpLabel(),
            supportSettings.supportEscalationContact(),
            supportSettings.emergencyContactVisible()
        );
    }

    private void ensureSupportActor(User user) {
        if (user.getRole() != Role.SUPPORT_AGENT && user.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support agents can perform this action");
        }
    }

    private User findSupportAgent() {
        return userRepository.findByRole(Role.SUPPORT_AGENT).stream().findFirst()
            .orElseGet(() -> userRepository.findByRole(Role.ADMIN).stream().findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No support agent or admin is available")));
    }

    private SupportTicket getTicket(Long ticketId) {
        return supportTicketRepository.findById(ticketId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Support ticket not found"));
    }

    private TicketResponse toResponse(SupportTicket ticket) {
        List<TicketReplyResponse> replies = supportTicketReplyRepository.findByTicketOrderByCreatedAtAsc(ticket).stream()
            .map(reply -> new TicketReplyResponse(
                reply.getId(),
                reply.getAuthor().getId(),
                reply.getMessage(),
                reply.getCreatedAt()
            ))
            .toList();
        return new TicketResponse(
            ticket.getId(),
            ticket.getCreatedBy().getId(),
            ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null,
            ticket.getSubject(),
            ticket.getDescription(),
            ticket.getTicketType(),
            ticket.getRideId(),
            ticket.getStatus(),
            ticket.getResolutionNotes(),
            ticket.getCreatedAt(),
            replies
        );
    }
}
