package com.kituirides.api.support;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.kituirides.api.chat.ChatThreadResponse;
import com.kituirides.api.chat.CreateChatThreadRequest;
import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationType;
import com.kituirides.api.domain.enums.Role;
import com.kituirides.api.domain.enums.TicketStatus;
import com.kituirides.api.domain.enums.TicketType;
import com.kituirides.api.repository.ConversationRepository;
import com.kituirides.api.repository.MessageReadStateRepository;
import com.kituirides.api.repository.MessageRepository;
import com.kituirides.api.repository.RideRepository;
import com.kituirides.api.repository.SupportTicketRepository;
import com.kituirides.api.repository.UserRepository;
import com.kituirides.api.security.CurrentUserService;
import com.kituirides.api.websocket.RealtimePublisher;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private MessageReadStateRepository messageReadStateRepository;
    @Mock private SupportTicketRepository supportTicketRepository;
    @Mock private UserRepository userRepository;
    @Mock private RideRepository rideRepository;
    @Mock private CurrentUserService currentUserService;
    @Mock private RealtimePublisher realtimePublisher;

    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(
            conversationRepository,
            messageRepository,
            messageReadStateRepository,
            supportTicketRepository,
            userRepository,
            rideRepository,
            currentUserService,
            realtimePublisher
        );
    }

    @Test
    void shouldCreateCustomerSupportThread() {
        User customer = user(1L, "Jane", "Customer", Role.CUSTOMER);
        User supportAgent = user(2L, "Grace", "Support", Role.SUPPORT_AGENT);
        AtomicReference<Message> savedMessage = configurePersistence();

        when(currentUserService.getCurrentUser()).thenReturn(customer);
        when(userRepository.findByRole(Role.SUPPORT_AGENT)).thenReturn(List.of(supportAgent));
        when(messageRepository.countUnreadMessages(any(Conversation.class), eq(customer.getId()))).thenReturn(0L);

        ChatThreadResponse response = chatService.createThread(new CreateChatThreadRequest(
            ConversationType.SUPPORT_CUSTOMER,
            null,
            null,
            TicketType.GENERAL,
            "App issue",
            "Customer cannot continue checkout"
        ));

        assertEquals(ConversationType.SUPPORT_CUSTOMER, response.threadType());
        assertNotNull(response.ticketId());
        assertEquals("Grace Support", response.participant().fullName());
        assertEquals("Customer cannot continue checkout", savedMessage.get().getContent());
    }

    @Test
    void shouldCreateDriverSupportThread() {
        User driver = user(3L, "Daniel", "Driver", Role.DRIVER);
        User supportAgent = user(4L, "Mercy", "Support", Role.SUPPORT_AGENT);
        configurePersistence();

        when(currentUserService.getCurrentUser()).thenReturn(driver);
        when(userRepository.findByRole(Role.SUPPORT_AGENT)).thenReturn(List.of(supportAgent));
        when(messageRepository.countUnreadMessages(any(Conversation.class), eq(driver.getId()))).thenReturn(0L);

        ChatThreadResponse response = chatService.createThread(new CreateChatThreadRequest(
            ConversationType.SUPPORT_DRIVER,
            null,
            null,
            TicketType.GENERAL,
            "Wallet help",
            "Driver needs help with wallet balance"
        ));

        assertEquals(ConversationType.SUPPORT_DRIVER, response.threadType());
        assertEquals("Mercy Support", response.participant().fullName());
    }

    @Test
    void shouldCreateSupportToAdminThread() {
        User supportAgent = user(5L, "Naomi", "Support", Role.SUPPORT_AGENT);
        User admin = user(6L, "Alex", "Admin", Role.ADMIN);
        configurePersistence();

        when(currentUserService.getCurrentUser()).thenReturn(supportAgent);
        when(userRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(messageRepository.countUnreadMessages(any(Conversation.class), eq(supportAgent.getId()))).thenReturn(0L);

        ChatThreadResponse response = chatService.createThread(new CreateChatThreadRequest(
            ConversationType.SUPPORT_ADMIN,
            admin.getId(),
            null,
            TicketType.GENERAL,
            "Escalation",
            "Need admin review for an operations issue"
        ));

        assertEquals(ConversationType.SUPPORT_ADMIN, response.threadType());
        assertEquals("Alex Admin", response.participant().fullName());
    }

    @Test
    void shouldCreateSupportToCustomerThread() {
        User supportAgent = user(13L, "Agnes", "Support", Role.SUPPORT_AGENT);
        User customer = user(14L, "Brian", "Customer", Role.CUSTOMER);
        configurePersistence();

        when(currentUserService.getCurrentUser()).thenReturn(supportAgent);
        when(userRepository.findById(customer.getId())).thenReturn(Optional.of(customer));
        when(messageRepository.countUnreadMessages(any(Conversation.class), eq(supportAgent.getId()))).thenReturn(0L);

        ChatThreadResponse response = chatService.createThread(new CreateChatThreadRequest(
            ConversationType.SUPPORT_CUSTOMER,
            customer.getId(),
            null,
            TicketType.GENERAL,
            "Manual outreach",
            "Support is opening a customer case proactively"
        ));

        assertEquals(ConversationType.SUPPORT_CUSTOMER, response.threadType());
        assertEquals("Brian Customer", response.participant().fullName());
    }

    @Test
    void shouldExposeCustomerThreadsToAnySupportAgent() {
        User customer = user(7L, "Miriam", "Customer", Role.CUSTOMER);
        User assignedSupport = user(8L, "Faith", "Support", Role.SUPPORT_AGENT);
        User viewerSupport = user(9L, "John", "Support", Role.SUPPORT_AGENT);
        Conversation thread = conversation(15L, customer, assignedSupport, ConversationType.SUPPORT_CUSTOMER);
        Message lastMessage = message(25L, thread, customer, "Please help");

        thread.setSupportAgent(assignedSupport);
        SupportTicket ticket = ticket(35L, customer, assignedSupport, "Help", "Please help");
        thread.setSupportTicket(ticket);

        when(currentUserService.getCurrentUser()).thenReturn(viewerSupport);
        when(conversationRepository.findVisibleThreadsByType(any())).thenReturn(List.of(thread));
        when(messageRepository.findTopByConversationIdOrderByCreatedAtDesc(thread.getId())).thenReturn(Optional.of(lastMessage));
        when(messageRepository.countUnreadMessages(thread, viewerSupport.getId())).thenReturn(1L);

        List<ChatThreadResponse> response = chatService.getThreads(List.of(ConversationType.SUPPORT_CUSTOMER), null, null, null);

        assertEquals(1, response.size());
        assertEquals("Miriam Customer", response.get(0).participant().fullName());
    }

    @Test
    void shouldReassignHandlingSupportAgentOnReplyAndShowCustomerTheNewHandler() {
        User customer = user(10L, "Pauline", "Customer", Role.CUSTOMER);
        User originalSupport = user(11L, "Mary", "Support", Role.SUPPORT_AGENT);
        User newSupport = user(12L, "Peter", "Support", Role.SUPPORT_AGENT);
        Conversation thread = conversation(41L, customer, originalSupport, ConversationType.SUPPORT_CUSTOMER);
        SupportTicket ticket = ticket(51L, customer, originalSupport, "Login help", "Customer cannot log in");
        thread.setSupportTicket(ticket);
        thread.setSupportAgent(originalSupport);
        AtomicReference<Message> savedMessage = new AtomicReference<>();

        when(currentUserService.getCurrentUser()).thenReturn(newSupport);
        when(conversationRepository.findById(thread.getId())).thenReturn(Optional.of(thread));
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(61L);
            savedMessage.set(message);
            return message;
        });

        chatService.sendMessage(thread.getId(), "I am taking this case now.");

        assertEquals(newSupport.getId(), thread.getSupportAgent().getId());
        assertEquals(newSupport.getId(), ticket.getAssignedTo().getId());

        when(currentUserService.getCurrentUser()).thenReturn(customer);
        when(messageRepository.findTopByConversationIdOrderByCreatedAtDesc(thread.getId())).thenReturn(Optional.of(savedMessage.get()));
        when(messageRepository.countUnreadMessages(thread, customer.getId())).thenReturn(0L);

        ChatThreadResponse customerView = chatService.getThread(thread.getId());
        assertEquals("Peter Support", customerView.participant().fullName());
    }

    private AtomicReference<Message> configurePersistence() {
        AtomicReference<Message> savedMessage = new AtomicReference<>();
        AtomicLong ticketIds = new AtomicLong(100L);
        AtomicLong threadIds = new AtomicLong(200L);
        AtomicLong messageIds = new AtomicLong(300L);

        when(supportTicketRepository.save(any(SupportTicket.class))).thenAnswer(invocation -> {
            SupportTicket ticket = invocation.getArgument(0);
            if (ticket.getId() == null) {
                ticket.setId(ticketIds.getAndIncrement());
            }
            if (ticket.getCreatedAt() == null) {
                ticket.setCreatedAt(Instant.now());
            }
            if (ticket.getUpdatedAt() == null) {
                ticket.setUpdatedAt(Instant.now());
            }
            if (ticket.getStatus() == null) {
                ticket.setStatus(TicketStatus.OPEN);
            }
            return ticket;
        });

        when(conversationRepository.save(any(Conversation.class))).thenAnswer(invocation -> {
            Conversation conversation = invocation.getArgument(0);
            if (conversation.getId() == null) {
                conversation.setId(threadIds.getAndIncrement());
            }
            return conversation;
        });

        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            if (message.getId() == null) {
                message.setId(messageIds.getAndIncrement());
            }
            savedMessage.set(message);
            return message;
        });

        when(messageRepository.findTopByConversationIdOrderByCreatedAtDesc(any(Long.class))).thenAnswer(invocation ->
            Optional.ofNullable(savedMessage.get())
        );

        return savedMessage;
    }

    private User user(Long id, String firstName, String lastName, Role role) {
        User user = new User();
        user.setId(id);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(firstName.toLowerCase() + "@kituirides.test");
        user.setPhoneNumber("2547000000" + id);
        user.setRole(role);
        user.setActive(true);
        return user;
    }

    private SupportTicket ticket(Long id, User createdBy, User assignedTo, String subject, String description) {
        SupportTicket ticket = new SupportTicket();
        ticket.setId(id);
        ticket.setCreatedBy(createdBy);
        ticket.setAssignedTo(assignedTo);
        ticket.setSubject(subject);
        ticket.setDescription(description);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setTicketType(TicketType.GENERAL);
        ticket.setCreatedAt(Instant.now());
        ticket.setUpdatedAt(Instant.now());
        return ticket;
    }

    private Conversation conversation(Long id, User participant1, User participant2, ConversationType type) {
        Conversation conversation = new Conversation();
        conversation.setId(id);
        conversation.setParticipant1(participant1);
        conversation.setParticipant2(participant2);
        conversation.setConversationType(type);
        conversation.setStatus(com.kituirides.api.domain.enums.ConversationStatus.OPEN);
        conversation.setSubject("Support thread");
        conversation.setCreatedAt(Instant.now());
        conversation.setUpdatedAt(Instant.now());
        conversation.setLastMessageAt(Instant.now());
        return conversation;
    }

    private Message message(Long id, Conversation conversation, User sender, String content) {
        Message message = new Message();
        message.setId(id);
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(content);
        message.setCreatedAt(Instant.now());
        return message;
    }
}
