package com.kituirides.api.support;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kituirides.api.admin.AdminSettingsService;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.repository.SupportTicketReplyRepository;
import com.kituirides.api.repository.SupportTicketRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.ride.RideService;
import com.kituirides.api.security.CurrentUserService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SupportServiceTest {

    @Mock private SupportTicketRepository supportTicketRepository;
    @Mock private SupportTicketReplyRepository supportTicketReplyRepository;
    @Mock private CurrentUserService currentUserService;
    @Mock private RideService rideService;
    @Mock private com.kituirides.api.payment.PaymentService paymentService;
    @Mock private UserRepository userRepository;
    @Mock private ChatService chatService;
    @Mock private AdminSettingsService adminSettingsService;

    @Test
    void shouldCreateRideSpecificSupportThreadsForDisputes() {
        SupportService service = new SupportService(
            supportTicketRepository,
            supportTicketReplyRepository,
            currentUserService,
            rideService,
            paymentService,
            userRepository,
            chatService,
            adminSettingsService
        );

        User customer = new User();
        customer.setId(1L);
        customer.setRole(Role.CUSTOMER);

        User driver = new User();
        driver.setId(2L);
        driver.setRole(Role.DRIVER);

        User supportAgent = new User();
        supportAgent.setId(3L);
        supportAgent.setRole(Role.SUPPORT_AGENT);

        Ride ride = new Ride();
        ride.setId(88L);
        ride.setCustomer(customer);
        ride.setRider(driver);

        when(currentUserService.getCurrentUser()).thenReturn(customer);
        when(rideService.getRideById(88L)).thenReturn(ride);
        when(userRepository.findByRole(Role.SUPPORT_AGENT)).thenReturn(List.of(supportAgent));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.raiseRideDispute(88L, "Customer disputes the final KM");

        verify(chatService).createTicketBackedThread(
            any(SupportTicket.class),
            org.mockito.ArgumentMatchers.eq(ConversationType.SUPPORT_CUSTOMER),
            org.mockito.ArgumentMatchers.eq(customer),
            org.mockito.ArgumentMatchers.eq(supportAgent),
            org.mockito.ArgumentMatchers.eq(ride),
            org.mockito.ArgumentMatchers.eq(customer),
            any(String.class),
            org.mockito.ArgumentMatchers.eq(false)
        );
        verify(chatService).createTicketBackedThread(
            any(SupportTicket.class),
            org.mockito.ArgumentMatchers.eq(ConversationType.SUPPORT_DRIVER),
            org.mockito.ArgumentMatchers.eq(driver),
            org.mockito.ArgumentMatchers.eq(supportAgent),
            org.mockito.ArgumentMatchers.eq(ride),
            org.mockito.ArgumentMatchers.isNull(),
            any(String.class),
            org.mockito.ArgumentMatchers.eq(true)
        );
        verify(rideService).markDisputed(any(Long.class), any(SupportTicket.class), any(String.class));
    }

    @Test
    void shouldCreateDriverCancellationReviewThread() {
        SupportService service = new SupportService(
            supportTicketRepository,
            supportTicketReplyRepository,
            currentUserService,
            rideService,
            paymentService,
            userRepository,
            chatService,
            adminSettingsService
        );

        User driver = new User();
        driver.setId(2L);
        driver.setRole(Role.DRIVER);

        User supportAgent = new User();
        supportAgent.setId(3L);
        supportAgent.setRole(Role.SUPPORT_AGENT);

        Ride ride = new Ride();
        ride.setId(88L);
        ride.setRider(driver);

        when(currentUserService.getCurrentUser()).thenReturn(driver);
        when(rideService.getRideById(88L)).thenReturn(ride);
        when(userRepository.findByRole(Role.SUPPORT_AGENT)).thenReturn(List.of(supportAgent));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SupportTicket ticket = service.createDriverCancellationReview(88L, "Customer did not show up at pickup.");

        assertNotNull(ticket);
        verify(chatService).createTicketBackedThread(
            any(SupportTicket.class),
            org.mockito.ArgumentMatchers.eq(ConversationType.SUPPORT_DRIVER),
            org.mockito.ArgumentMatchers.eq(driver),
            org.mockito.ArgumentMatchers.eq(supportAgent),
            org.mockito.ArgumentMatchers.eq(ride),
            org.mockito.ArgumentMatchers.eq(driver),
            org.mockito.ArgumentMatchers.eq("Customer did not show up at pickup."),
            org.mockito.ArgumentMatchers.eq(false)
        );
    }
}
