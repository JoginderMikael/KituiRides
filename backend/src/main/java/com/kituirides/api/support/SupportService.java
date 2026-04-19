package com.kituirides.api.support;

import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.SupportTicketReply;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.SupportTicketRepository;
import com.kituirides.api.repository.SupportTicketReplyRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.RiderProfileRepository;
import com.kituirides.api.repository.VehicleRepository;
import com.kituirides.api.ride.RideResponse;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.payment.PaymentService;
import com.kituirides.api.payment.PriceCalculationService;
import com.kituirides.api.security.CurrentUserService;
import java.math.BigDecimal;
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
    private final RideRepository rideRepository;
    private final CurrentUserService currentUserService;
    private final RideService rideService;
    private final PaymentService paymentService;
    private final PriceCalculationService priceCalculationService;
    private final RiderProfileRepository riderProfileRepository;
    private final VehicleRepository vehicleRepository;

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

    public List<TicketResponse> assignedOrOpenTicketsForAgent() {
        var agent = currentUserService.getCurrentUser();
        if (agent.getRole() != Role.SUPPORT_AGENT && agent.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support agents can view support queue");
        }
        return supportTicketRepository.findAll().stream()
            .filter(ticket -> ticket.getAssignedTo() == null || ticket.getAssignedTo().getId().equals(agent.getId()))
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public TicketResponse replyToTicket(Long ticketId, TicketReplyRequest request) {
        var agent = currentUserService.getCurrentUser();
        SupportTicket ticket = getTicket(ticketId);
        if (ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(agent);
        }
        SupportTicketReply reply = new SupportTicketReply();
        reply.setTicket(ticket);
        reply.setAuthor(agent);
        reply.setMessage(request.message());
        supportTicketReplyRepository.save(reply);
        return toResponse(supportTicketRepository.save(ticket));
    }

    @Transactional
    public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest request) {
        var agent = currentUserService.getCurrentUser();
        SupportTicket ticket = getTicket(ticketId);
        if (ticket.getAssignedTo() == null) {
            ticket.setAssignedTo(agent);
        }
        ticket.setStatus(request.status());
        return toResponse(supportTicketRepository.save(ticket));
    }

    @Transactional
    public RideResponse fixRideKms(Long rideId, BigDecimal newKms) {
        var agent = currentUserService.getCurrentUser();
        if (agent.getRole() != Role.SUPPORT_AGENT && agent.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support agents can fix ride KMs");
        }
        
        Ride ride = rideService.getRideById(rideId);
        ride.setDistanceKm(newKms);
        
        var profile = riderProfileRepository.findByUserId(ride.getRider().getId())
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Driver profile not found"));
        var vehicle = vehicleRepository.findByRiderProfile(profile)
            .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Driver has no vehicle"));

        BigDecimal newFare = priceCalculationService.calculatePrice(
            newKms, 
            ride.getVehicleType(), 
            vehicle.getEngineSize(), 
            ride.getSurgeMultiplier()
        );
        ride.setFinalFare(newFare);
        
        rideRepository.save(ride);
        
        return rideService.toResponse(ride);
    }

    @Transactional
    public RideResponse forceApprovePayment(Long rideId) {
        var agent = currentUserService.getCurrentUser();
        if (agent.getRole() != Role.SUPPORT_AGENT && agent.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support agents can force approve payment");
        }
        paymentService.approveCashPayment(rideId);
        return rideService.toResponse(rideService.getRideById(rideId));
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
            ticket.getStatus(),
            ticket.getCreatedAt(),
            replies
        );
    }
}
