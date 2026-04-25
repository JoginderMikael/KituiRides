package com.kituirides.api.support;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.SupportTicketReply;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationType;
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

/**
 * Handles support workflows.
 */
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
        User user = currentUserService.getCurrentUser();
        User assignedSupport = findSupportAgent();
        SupportTicket ticket = new SupportTicket();
        ticket.setCreatedBy(user);
        ticket.setAssignedTo(assignedSupport);
        ticket.setSubject(request.subject());
        ticket.setDescription(request.description());
        ticket.setTicketType(request.ticketType() != null ? request.ticketType() : TicketType.GENERAL);
        ticket.setRideId(request.rideId());
        ticket.setUpdatedAt(Instant.now());
        ticket = supportTicketRepository.save(ticket);

        Ride ride = request.rideId() != null ? getValidatedRideForTicket(request.rideId(), user) : null;
        ConversationType threadType = switch (user.getRole()) {
            case CUSTOMER -> ConversationType.SUPPORT_CUSTOMER;
            case DRIVER -> ConversationType.SUPPORT_DRIVER;
            case SUPPORT_AGENT, ADMIN -> ConversationType.SUPPORT_ADMIN;
        };
        chatService.createTicketBackedThread(
            ticket,
            threadType,
            user,
            assignedSupport,
            ride,
            user,
            request.description(),
            false
        );
        return toResponse(ticket);
    }

    public List<TicketResponse> myTickets() {
        User user = currentUserService.getCurrentUser();
        return supportTicketRepository.findByCreatedByOrderByCreatedAtDesc(user).stream()
            .map(this::toResponse)
            .toList();
    }

    public List<TicketResponse> assignedOrOpenTicketsForAgent() {
        User agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        return supportTicketRepository.findByAssignedToOrAssignedToIsNullOrderByCreatedAtDesc(agent).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public TicketResponse replyToTicket(Long ticketId, TicketReplyRequest request) {
        User agent = currentUserService.getCurrentUser();
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
        ticket.setUpdatedAt(Instant.now());
        supportTicketRepository.save(ticket);
        return toResponse(ticket);
    }

    @Transactional
    public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest request) {
        User agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        SupportTicket ticket = getTicket(ticketId);
        if (ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(agent);
        }
        ticket.setStatus(request.status());
        ticket.setUpdatedAt(Instant.now());
        if (request.status() == com.kituirides.api.domain.enums.TicketStatus.RESOLVED) {
            ticket.setClosedAt(Instant.now());
        }
        if (request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        ticket = supportTicketRepository.save(ticket);
        chatService.syncResolvedTicket(ticket);
        return toResponse(ticket);
    }

    @Transactional
    public RideResponse raiseRideDispute(Long rideId, String reason) {
        User actor = currentUserService.getCurrentUser();
        Ride ride = rideService.getRideById(rideId);
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
        ticket.setUpdatedAt(Instant.now());
        ticket = supportTicketRepository.save(ticket);

        chatService.createTicketBackedThread(
            ticket,
            ConversationType.SUPPORT_CUSTOMER,
            ride.getCustomer(),
            supportAgent,
            ride,
            ride.getCustomer().getId().equals(actor.getId()) ? actor : null,
            ride.getCustomer().getId().equals(actor.getId())
                ? reason
                : "A ride dispute case was opened for this ride. Support will continue updates here.",
            !ride.getCustomer().getId().equals(actor.getId())
        );
        if (ride.getRider() != null) {
            chatService.createTicketBackedThread(
                ticket,
                ConversationType.SUPPORT_DRIVER,
                ride.getRider(),
                supportAgent,
                ride,
                ride.getRider().getId().equals(actor.getId()) ? actor : null,
                ride.getRider().getId().equals(actor.getId())
                    ? reason
                    : "A ride dispute case was opened for this ride. Support will continue updates here.",
                !ride.getRider().getId().equals(actor.getId())
            );
        }
        return rideService.markDisputed(rideId, ticket, reason);
    }

    @Transactional
    public SupportTicket createDriverCancellationReview(Long rideId, String reason) {
        User driver = currentUserService.getCurrentUser();
        Ride ride = rideService.getRideById(rideId);
        if (driver.getRole() != Role.DRIVER || ride.getRider() == null || !ride.getRider().getId().equals(driver.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only the assigned driver can request cancellation review");
        }

        User supportAgent = findSupportAgent();
        SupportTicket ticket = new SupportTicket();
        ticket.setCreatedBy(driver);
        ticket.setAssignedTo(supportAgent);
        ticket.setSubject("Driver cancellation review for ride #" + rideId);
        ticket.setDescription(reason);
        ticket.setTicketType(TicketType.GENERAL);
        ticket.setRideId(rideId);
        ticket.setUpdatedAt(Instant.now());
        ticket = supportTicketRepository.save(ticket);

        chatService.createTicketBackedThread(
            ticket,
            ConversationType.SUPPORT_DRIVER,
            driver,
            supportAgent,
            ride,
            driver,
            reason,
            false
        );
        return ticket;
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
        User agent = currentUserService.getCurrentUser();
        ensureSupportActor(agent);
        SupportTicket ticket = supportTicketRepository.findFirstByRideIdAndTicketTypeOrderByCreatedAtDesc(rideId, TicketType.DISPUTE)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispute ticket not found for this ride"));
        ticket.setAssignedTo(ticket.getAssignedTo() != null ? ticket.getAssignedTo() : agent);
        ticket.setStatus(com.kituirides.api.domain.enums.TicketStatus.RESOLVED);
        ticket.setUpdatedAt(Instant.now());
        ticket.setClosedAt(Instant.now());
        if (request.resolutionNotes() != null && !request.resolutionNotes().isBlank()) {
            ticket.setResolutionNotes(request.resolutionNotes());
        }
        ticket = supportTicketRepository.save(ticket);
        chatService.syncResolvedTicket(ticket);
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

    private Ride getValidatedRideForTicket(Long rideId, User actor) {
        Ride ride = rideService.getRideById(rideId);
        if (actor.getRole() == Role.CUSTOMER && !ride.getCustomer().getId().equals(actor.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ride does not belong to the current customer");
        }
        if (actor.getRole() == Role.DRIVER && (ride.getRider() == null || !ride.getRider().getId().equals(actor.getId()))) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Ride does not belong to the current driver");
        }
        return ride;
    }
}
