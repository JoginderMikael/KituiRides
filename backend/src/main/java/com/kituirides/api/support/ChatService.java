package com.kituirides.api.support;

import com.kituirides.api.chat.ChatMessageResponse;
import com.kituirides.api.chat.ChatParticipantOptionResponse;
import com.kituirides.api.chat.ChatParticipantResponse;
import com.kituirides.api.chat.ChatThreadPermissionsResponse;
import com.kituirides.api.chat.ChatThreadResponse;
import com.kituirides.api.chat.ChatUnreadSummaryResponse;
import com.kituirides.api.chat.CreateChatThreadRequest;
import com.kituirides.api.common.ApiException;
import com.kituirides.api.domain.entity.Conversation;
import com.kituirides.api.domain.entity.Message;
import com.kituirides.api.domain.entity.MessageReadState;
import com.kituirides.api.domain.entity.Ride;
import com.kituirides.api.domain.entity.SupportTicket;
import com.kituirides.api.domain.entity.User;
import com.kituirides.api.domain.enums.ConversationStatus;
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
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final Duration AUTO_CLOSE_AFTER = Duration.ofHours(100);
    private static final Set<ConversationType> SUPPORT_THREAD_TYPES = EnumSet.of(
        ConversationType.SUPPORT_CUSTOMER,
        ConversationType.SUPPORT_DRIVER,
        ConversationType.SUPPORT_ADMIN
    );

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final MessageReadStateRepository messageReadStateRepository;
    private final SupportTicketRepository supportTicketRepository;
    private final UserRepository userRepository;
    private final RideRepository rideRepository;
    private final CurrentUserService currentUserService;
    private final RealtimePublisher realtimePublisher;

    @Transactional(readOnly = true)
    public List<ChatThreadResponse> getThreads(
        Collection<ConversationType> requestedTypes,
        ConversationStatus status,
        String search,
        Long rideId
    ) {
        User currentUser = currentUserService.getCurrentUser();
        Set<ConversationType> allowedTypes = resolveRequestedThreadTypes(currentUser, requestedTypes);
        if (allowedTypes.isEmpty()) {
            return List.of();
        }

        String normalizedSearch = normalizeSearch(search);
        return listVisibleThreads(currentUser, allowedTypes).stream()
            .filter(thread -> rideId == null || Objects.equals(extractRideId(thread), rideId))
            .filter(thread -> status == null || thread.getStatus() == status)
            .filter(thread -> matchesSearch(thread, currentUser, normalizedSearch))
            .map(thread -> toThreadResponse(thread, currentUser))
            .toList();
    }

    @Transactional(readOnly = true)
    public ChatThreadResponse getThread(Long threadId) {
        User currentUser = currentUserService.getCurrentUser();
        return toThreadResponse(getAccessibleThread(threadId, currentUser), currentUser);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getThreadMessages(Long threadId) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation thread = getAccessibleThread(threadId, currentUser);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(thread.getId()).stream()
            .map(message -> toMessageResponse(message, currentUser))
            .toList();
    }

    @Transactional(readOnly = true)
    public ChatUnreadSummaryResponse getUnreadSummary() {
        User currentUser = currentUserService.getCurrentUser();
        List<Conversation> threads = listVisibleThreads(currentUser, resolveAccessibleThreadTypes(currentUser.getRole()));

        long supportCustomerUnread = 0L;
        long supportDriverUnread = 0L;
        long supportAdminUnread = 0L;

        for (Conversation thread : threads) {
            long unread = unreadCount(thread, currentUser);
            if (thread.getConversationType() == ConversationType.SUPPORT_CUSTOMER) {
                supportCustomerUnread += unread;
            } else if (thread.getConversationType() == ConversationType.SUPPORT_DRIVER) {
                supportDriverUnread += unread;
            } else if (thread.getConversationType() == ConversationType.SUPPORT_ADMIN) {
                supportAdminUnread += unread;
            }
        }

        return new ChatUnreadSummaryResponse(
            supportCustomerUnread + supportDriverUnread + supportAdminUnread,
            supportCustomerUnread,
            supportDriverUnread,
            supportAdminUnread
        );
    }

    @Transactional(readOnly = true)
    public List<ChatParticipantOptionResponse> searchParticipants(Collection<Role> requestedRoles, String query) {
        User currentUser = currentUserService.getCurrentUser();
        if (currentUser.getRole() != Role.SUPPORT_AGENT && currentUser.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support staff can search chat participants");
        }

        Set<Role> allowedRoles = resolveSearchableRoles(currentUser);
        Set<Role> roles = requestedRoles == null || requestedRoles.isEmpty()
            ? allowedRoles
            : requestedRoles.stream()
                .filter(allowedRoles::contains)
                .collect(LinkedHashSet::new, Set::add, Set::addAll);

        if (roles.isEmpty()) {
            return List.of();
        }

        String normalizedQuery = normalizeSearch(query);
        return userRepository.findByRoleInAndActiveTrueOrderByFirstNameAscLastNameAsc(new ArrayList<>(roles)).stream()
            .filter(candidate -> !candidate.getId().equals(currentUser.getId()))
            .filter(candidate -> normalizedQuery == null || matchesUser(candidate, normalizedQuery))
            .limit(20)
            .map(this::toParticipantOption)
            .toList();
    }

    @Transactional
    public ChatThreadResponse createThread(CreateChatThreadRequest request) {
        User actor = currentUserService.getCurrentUser();
        ThreadCreationContext context = resolveThreadCreation(actor, request);

        Instant now = Instant.now();
        SupportTicket ticket = new SupportTicket();
        ticket.setCreatedBy(actor);
        ticket.setAssignedTo(context.assignedTo());
        ticket.setSubject(request.subject().trim());
        ticket.setDescription(request.description().trim());
        ticket.setTicketType(request.ticketType() != null ? request.ticketType() : TicketType.GENERAL);
        ticket.setRideId(context.ride() != null ? context.ride().getId() : null);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setCreatedAt(now);
        ticket.setUpdatedAt(now);
        ticket = supportTicketRepository.save(ticket);

        Conversation thread = createConversationForTicket(
            ticket,
            context.threadType(),
            actor,
            context.participant(),
            context.ride()
        );

        appendMessage(thread, actor, request.description().trim(), false);
        log.info("Created chat thread {} for ticket {}", thread.getId(), ticket.getId());
        notifyThreadChanged(thread, "THREAD_CREATED");
        return toThreadResponse(thread, actor);
    }

    @Transactional
    public ChatMessageResponse sendMessage(Long threadId, String content) {
        User sender = currentUserService.getCurrentUser();
        Conversation thread = getAccessibleThread(threadId, sender);
        if (!canReply(thread, sender)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This thread is not open for replies");
        }

        updateHandlingSupportActor(thread, sender);
        Message message = appendMessage(thread, sender, content.trim(), false);
        notifyThreadChanged(thread, "MESSAGE_SENT");
        return toMessageResponse(message, sender);
    }

    @Transactional
    public void markThreadAsRead(Long threadId) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation thread = getAccessibleThread(threadId, currentUser);
        List<MessageReadState> readStates = messageRepository.findUnreadMessages(thread, currentUser.getId()).stream()
            .map(message -> {
                MessageReadState state = new MessageReadState();
                state.setMessage(message);
                state.setUser(currentUser);
                state.setReadAt(Instant.now());
                return state;
            })
            .toList();

        if (!readStates.isEmpty()) {
            messageReadStateRepository.saveAll(readStates);
            notifyInboxParticipants(thread, "THREAD_READ");
        }
    }

    @Transactional
    public ChatThreadResponse closeThread(Long threadId, String resolutionNotes) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation thread = getAccessibleThread(threadId, currentUser);
        ensureCanManageThread(thread, currentUser);
        if (thread.getStatus() == ConversationStatus.CLOSED) {
            return toThreadResponse(thread, currentUser);
        }

        Instant now = Instant.now();
        updateHandlingSupportActor(thread, currentUser);
        thread.setStatus(ConversationStatus.CLOSED);
        thread.setClosedAt(now);
        thread.setUpdatedAt(now);
        conversationRepository.save(thread);
        applyTicketUpdate(thread.getSupportTicket(), TicketStatus.IN_PROGRESS, resolutionNotes, false);
        appendMessage(thread, null, "This thread was closed by support.", true);
        notifyThreadChanged(thread, "THREAD_CLOSED");
        return toThreadResponse(thread, currentUser);
    }

    @Transactional
    public ChatThreadResponse resolveThread(Long threadId, String resolutionNotes) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation thread = getAccessibleThread(threadId, currentUser);
        ensureCanManageThread(thread, currentUser);

        Instant now = Instant.now();
        updateHandlingSupportActor(thread, currentUser);
        thread.setStatus(ConversationStatus.RESOLVED);
        thread.setClosedAt(now);
        thread.setUpdatedAt(now);
        conversationRepository.save(thread);
        applyTicketUpdate(thread.getSupportTicket(), TicketStatus.RESOLVED, resolutionNotes, true);
        appendMessage(thread, null, "This thread was resolved by support.", true);
        notifyThreadChanged(thread, "THREAD_RESOLVED");
        return toThreadResponse(thread, currentUser);
    }

    @Transactional
    public ChatThreadResponse reopenThread(Long threadId) {
        User currentUser = currentUserService.getCurrentUser();
        Conversation thread = getAccessibleThread(threadId, currentUser);
        ensureCanManageThread(thread, currentUser);

        Instant now = Instant.now();
        updateHandlingSupportActor(thread, currentUser);
        thread.setStatus(ConversationStatus.REOPENED);
        thread.setUpdatedAt(now);
        conversationRepository.save(thread);
        applyTicketUpdate(thread.getSupportTicket(), TicketStatus.IN_PROGRESS, null, false);
        appendMessage(thread, null, "This thread was reopened.", true);
        notifyThreadChanged(thread, "THREAD_REOPENED");
        return toThreadResponse(thread, currentUser);
    }

    @Transactional
    public Conversation createConversationForTicket(
        SupportTicket ticket,
        ConversationType threadType,
        User participantOne,
        User participantTwo,
        Ride ride
    ) {
        if (!SUPPORT_THREAD_TYPES.contains(threadType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only support thread types can be created");
        }

        Instant now = Instant.now();
        Conversation conversation = new Conversation();
        conversation.setSupportTicket(ticket);
        conversation.setRide(ride);
        conversation.setParticipant1(participantOne);
        conversation.setParticipant2(participantTwo);
        conversation.setConversationType(threadType);
        conversation.setSupportAgent(resolveSupportAgentParticipant(participantOne, participantTwo));
        conversation.setStatus(ConversationStatus.OPEN);
        conversation.setSubject(ticket.getSubject());
        conversation.setCreatedAt(now);
        conversation.setUpdatedAt(now);
        conversation.setLastMessageAt(now);
        return conversationRepository.save(conversation);
    }

    @Transactional
    public ChatThreadResponse createTicketBackedThread(
        SupportTicket ticket,
        ConversationType threadType,
        User participant,
        User supportActor,
        Ride ride,
        User initialSender,
        String initialMessage,
        boolean systemMessage
    ) {
        User sender = initialSender != null ? initialSender : participant;
        Conversation thread = createConversationForTicket(ticket, threadType, participant, supportActor, ride);
        appendMessage(thread, systemMessage ? null : sender, initialMessage, systemMessage);
        notifyThreadChanged(thread, "THREAD_CREATED");
        return toThreadResponse(thread, sender);
    }

    @Transactional
    public Conversation ensureRideChatThread(Ride ride) {
        if (ride == null || ride.getId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride chat requires a saved ride");
        }
        if (ride.getCustomer() == null || ride.getRider() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ride chat requires both customer and driver");
        }

        Instant now = Instant.now();
        Conversation thread = conversationRepository.findRideConversation(
                ride,
                ConversationType.RIDE_CHAT,
                ride.getCustomer(),
                ride.getRider()
            )
            .orElseGet(() -> {
                Conversation conversation = new Conversation();
                conversation.setRide(ride);
                conversation.setParticipant1(ride.getCustomer());
                conversation.setParticipant2(ride.getRider());
                conversation.setConversationType(ConversationType.RIDE_CHAT);
                conversation.setStatus(ConversationStatus.OPEN);
                conversation.setSubject("Ride #" + ride.getId() + " chat");
                conversation.setCreatedAt(now);
                conversation.setUpdatedAt(now);
                conversation.setLastMessageAt(now);
                Conversation saved = conversationRepository.save(conversation);
                appendMessage(saved, null, "Ride chat opened. You can coordinate pickup and trip updates here.", true);
                notifyThreadChanged(saved, "THREAD_CREATED");
                return saved;
            });

        if (thread.getStatus() == ConversationStatus.CLOSED || thread.getStatus() == ConversationStatus.RESOLVED) {
            thread.setStatus(ConversationStatus.REOPENED);
            thread.setClosedAt(null);
            thread.setAutoClosedAt(null);
            thread.setUpdatedAt(now);
            thread = conversationRepository.save(thread);
            appendMessage(thread, null, "Ride chat reopened for this active ride.", true);
            notifyThreadChanged(thread, "THREAD_REOPENED");
        }

        return thread;
    }

    @Transactional
    public void closeRideChatThread(Ride ride, String message) {
        if (ride == null || ride.getId() == null) {
            return;
        }

        conversationRepository.findByRide_IdAndConversationType(ride.getId(), ConversationType.RIDE_CHAT)
            .ifPresent(thread -> {
                if (thread.getStatus() == ConversationStatus.CLOSED || thread.getStatus() == ConversationStatus.RESOLVED) {
                    return;
                }

                Instant now = Instant.now();
                thread.setStatus(ConversationStatus.CLOSED);
                thread.setClosedAt(now);
                thread.setUpdatedAt(now);
                Conversation saved = conversationRepository.save(thread);
                appendMessage(
                    saved,
                    null,
                    message == null || message.isBlank()
                        ? "This ride chat was closed."
                        : message.trim(),
                    true
                );
                notifyThreadChanged(saved, "THREAD_CLOSED");
            });
    }

    @Transactional
    public void syncResolvedTicket(SupportTicket ticket) {
        if (ticket == null || ticket.getStatus() != TicketStatus.RESOLVED) {
            return;
        }

        conversationRepository.findBySupportTicket_Id(ticket.getId()).forEach(thread -> {
            thread.setStatus(ConversationStatus.RESOLVED);
            thread.setClosedAt(Instant.now());
            thread.setUpdatedAt(Instant.now());
            conversationRepository.save(thread);
            appendMessage(thread, null, "This thread was resolved from the ticket workflow.", true);
            notifyThreadChanged(thread, "THREAD_RESOLVED");
        });
    }

    @Transactional
    public void autoCloseInactiveThreads() {
        Instant cutoff = Instant.now().minus(AUTO_CLOSE_AFTER);
        List<Conversation> staleThreads = conversationRepository.findThreadsEligibleForAutoClose(
            SUPPORT_THREAD_TYPES,
            List.of(ConversationStatus.OPEN, ConversationStatus.REOPENED),
            cutoff
        );

        for (Conversation thread : staleThreads) {
            Instant now = Instant.now();
            thread.setStatus(ConversationStatus.CLOSED);
            thread.setClosedAt(now);
            thread.setAutoClosedAt(now);
            thread.setUpdatedAt(now);
            conversationRepository.save(thread);
            appendMessage(
                thread,
                null,
                "This thread was automatically closed after 100 hours of inactivity.",
                true
            );
            notifyThreadChanged(thread, "THREAD_AUTO_CLOSED");
        }
    }

    private Message appendMessage(Conversation thread, User sender, String rawContent, boolean systemMessage) {
        String content = rawContent == null ? "" : rawContent.trim();
        if (content.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Message content is required");
        }

        Message message = new Message();
        message.setConversation(thread);
        message.setSender(sender);
        message.setContent(content);
        message.setSystemMessage(systemMessage);
        message.setIsRead(false);
        message.setCreatedAt(Instant.now());
        message = messageRepository.save(message);

        thread.setUpdatedAt(message.getCreatedAt());
        thread.setLastMessageAt(message.getCreatedAt());
        conversationRepository.save(thread);
        return message;
    }

    private ThreadCreationContext resolveThreadCreation(User actor, CreateChatThreadRequest request) {
        Ride ride = request.rideId() != null ? getAccessibleRideForActor(actor, request.rideId()) : null;

        return switch (actor.getRole()) {
            case CUSTOMER -> {
                User supportAssignee = findSupportStaffAssignee();
                yield new ThreadCreationContext(
                    ConversationType.SUPPORT_CUSTOMER,
                    supportAssignee,
                    supportAssignee,
                    validateRideParticipation(ride, actor)
                );
            }
            case DRIVER -> {
                User supportAssignee = findSupportStaffAssignee();
                yield new ThreadCreationContext(
                    ConversationType.SUPPORT_DRIVER,
                    supportAssignee,
                    supportAssignee,
                    validateRideParticipation(ride, actor)
                );
            }
            case SUPPORT_AGENT -> resolveSupportStaffThreadCreation(actor, request, ride);
            case ADMIN -> resolveAdminThreadCreation(actor, request, ride);
        };
    }

    private ThreadCreationContext resolveSupportStaffThreadCreation(User actor, CreateChatThreadRequest request, Ride ride) {
        if (request.threadType() == null || !SUPPORT_THREAD_TYPES.contains(request.threadType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Support must choose a valid support thread type");
        }
        User participant = resolveRequiredParticipant(request.participantUserId());
        validateParticipantForThreadType(participant, request.threadType(), actor.getRole());
        validateRideParticipantIfPresent(ride, participant);
        return new ThreadCreationContext(
            request.threadType(),
            participant,
            request.threadType() == ConversationType.SUPPORT_ADMIN ? participant : actor,
            ride
        );
    }

    private ThreadCreationContext resolveAdminThreadCreation(User actor, CreateChatThreadRequest request, Ride ride) {
        ConversationType threadType = request.threadType() != null ? request.threadType() : ConversationType.SUPPORT_ADMIN;
        if (threadType != ConversationType.SUPPORT_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admins can only create support-admin threads");
        }
        User participant = resolveRequiredParticipant(request.participantUserId());
        validateParticipantForThreadType(participant, threadType, actor.getRole());
        return new ThreadCreationContext(threadType, participant, participant, ride);
    }

    private SupportTicket applyTicketUpdate(
        SupportTicket ticket,
        TicketStatus status,
        String resolutionNotes,
        boolean closeTicket
    ) {
        if (ticket == null) {
            return null;
        }

        ticket.setStatus(status);
        ticket.setUpdatedAt(Instant.now());
        if (resolutionNotes != null && !resolutionNotes.isBlank()) {
            ticket.setResolutionNotes(resolutionNotes.trim());
        }
        if (closeTicket) {
            ticket.setClosedAt(Instant.now());
        }
        return supportTicketRepository.save(ticket);
    }

    private Conversation getAccessibleThread(Long threadId, User currentUser) {
        Conversation thread = conversationRepository.findById(threadId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Thread not found"));
        if (!resolveAccessibleThreadTypes(currentUser.getRole()).contains(thread.getConversationType()) || !canAccess(thread, currentUser)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Thread does not belong to the current user");
        }
        return thread;
    }

    private boolean canAccess(Conversation thread, User currentUser) {
        if (currentUser.getRole() == Role.SUPPORT_AGENT) {
            return resolveAccessibleThreadTypes(currentUser.getRole()).contains(thread.getConversationType());
        }
        if (currentUser.getRole() == Role.ADMIN) {
            return thread.getConversationType() == ConversationType.SUPPORT_ADMIN;
        }
        if (isParticipant(thread, currentUser)) {
            return true;
        }
        SupportTicket ticket = thread.getSupportTicket();
        return ticket != null && ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(currentUser.getId());
    }

    private boolean canReply(Conversation thread, User user) {
        boolean threadOpen = thread.getStatus() == ConversationStatus.OPEN || thread.getStatus() == ConversationStatus.REOPENED;
        if (!threadOpen) {
            return false;
        }
        if (user.getRole() == Role.SUPPORT_AGENT) {
            return resolveAccessibleThreadTypes(user.getRole()).contains(thread.getConversationType());
        }
        if (user.getRole() == Role.ADMIN) {
            return thread.getConversationType() == ConversationType.SUPPORT_ADMIN;
        }
        return isParticipant(thread, user);
    }

    private void ensureCanManageThread(Conversation thread, User currentUser) {
        if (!SUPPORT_THREAD_TYPES.contains(thread.getConversationType())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support threads can be managed");
        }
        if (currentUser.getRole() != Role.SUPPORT_AGENT && currentUser.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only support staff can manage thread status");
        }
        if (!canAccess(thread, currentUser)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Thread does not belong to the current user");
        }
    }

    private ChatThreadResponse toThreadResponse(Conversation thread, User currentUser) {
        SupportTicket ticket = thread.getSupportTicket();
        return new ChatThreadResponse(
            thread.getId(),
            ticket != null ? ticket.getId() : null,
            extractRideId(thread),
            thread.getSubject(),
            ticket != null ? ticket.getDescription() : null,
            thread.getConversationType(),
            thread.getStatus(),
            ticket != null ? ticket.getTicketType() : null,
            ticket != null ? ticket.getStatus() : null,
            ticket != null ? ticket.getResolutionNotes() : null,
            lastMessagePreview(thread),
            unreadCount(thread, currentUser),
            thread.getCreatedAt(),
            thread.getUpdatedAt(),
            thread.getLastMessageAt(),
            thread.getClosedAt(),
            thread.getAutoClosedAt(),
            toParticipantResponse(resolveVisibleCounterpart(thread, currentUser)),
            new ChatThreadPermissionsResponse(
                canReply(thread, currentUser),
                canManageThreadStatus(thread, currentUser),
                canManageThreadStatus(thread, currentUser),
                canManageThreadStatus(thread, currentUser)
                    && (thread.getStatus() == ConversationStatus.CLOSED || thread.getStatus() == ConversationStatus.RESOLVED)
            )
        );
    }

    private boolean canManageThreadStatus(Conversation thread, User currentUser) {
        return (currentUser.getRole() == Role.SUPPORT_AGENT || currentUser.getRole() == Role.ADMIN)
            && canAccess(thread, currentUser);
    }

    private ChatMessageResponse toMessageResponse(Message message, User currentUser) {
        boolean readByCurrentUser = message.getSender() != null && message.getSender().getId().equals(currentUser.getId());
        if (!readByCurrentUser) {
            readByCurrentUser = messageReadStateRepository.existsByMessage_IdAndUser_Id(message.getId(), currentUser.getId());
        }

        return new ChatMessageResponse(
            message.getId(),
            message.getContent(),
            message.getSystemMessage(),
            readByCurrentUser,
            message.getCreatedAt(),
            message.getSender() != null ? toParticipantResponse(message.getSender()) : null
        );
    }

    private long unreadCount(Conversation thread, User currentUser) {
        return messageRepository.countUnreadMessages(thread, currentUser.getId());
    }

    private String lastMessagePreview(Conversation thread) {
        return messageRepository.findTopByConversationIdOrderByCreatedAtDesc(thread.getId())
            .map(Message::getContent)
            .map(this::truncate)
            .orElse(null);
    }

    private ChatParticipantResponse toParticipantResponse(User user) {
        if (user == null) {
            return null;
        }
        return new ChatParticipantResponse(user.getId(), fullName(user), user.getPhoneNumber(), user.getRole());
    }

    private ChatParticipantOptionResponse toParticipantOption(User user) {
        return new ChatParticipantOptionResponse(user.getId(), fullName(user), user.getPhoneNumber(), user.getRole());
    }

    private String fullName(User user) {
        return (user.getFirstName() + " " + user.getLastName()).trim();
    }

    private User resolveCounterpart(Conversation thread, User currentUser) {
        if (thread.getParticipant1() != null && thread.getParticipant1().getId().equals(currentUser.getId())) {
            return thread.getParticipant2();
        }
        if (thread.getParticipant2() != null && thread.getParticipant2().getId().equals(currentUser.getId())) {
            return thread.getParticipant1();
        }

        if (thread.getParticipant1() != null && thread.getParticipant1().getRole() != currentUser.getRole()) {
            return thread.getParticipant1();
        }
        return thread.getParticipant2();
    }

    private User resolveVisibleCounterpart(Conversation thread, User currentUser) {
        User handlingSupportActor = resolveHandlingSupportActor(thread);
        if ((currentUser.getRole() == Role.CUSTOMER || currentUser.getRole() == Role.DRIVER)
            && handlingSupportActor != null
            && (thread.getConversationType() == ConversationType.SUPPORT_CUSTOMER
                || thread.getConversationType() == ConversationType.SUPPORT_DRIVER)) {
            return handlingSupportActor;
        }
        if (currentUser.getRole() == Role.ADMIN
            && thread.getConversationType() == ConversationType.SUPPORT_ADMIN
            && handlingSupportActor != null) {
            return handlingSupportActor;
        }
        return resolveCounterpart(thread, currentUser);
    }

    private boolean isParticipant(Conversation thread, User user) {
        return (thread.getParticipant1() != null && thread.getParticipant1().getId().equals(user.getId()))
            || (thread.getParticipant2() != null && thread.getParticipant2().getId().equals(user.getId()));
    }

    private Set<ConversationType> resolveRequestedThreadTypes(User currentUser, Collection<ConversationType> requestedTypes) {
        Set<ConversationType> allowedTypes = resolveAccessibleThreadTypes(currentUser.getRole());
        if (requestedTypes == null || requestedTypes.isEmpty()) {
            return allowedTypes;
        }
        Set<ConversationType> filtered = requestedTypes.stream()
            .filter(allowedTypes::contains)
            .collect(LinkedHashSet::new, Set::add, Set::addAll);
        return filtered;
    }

    private Set<ConversationType> resolveAccessibleThreadTypes(Role role) {
        return switch (role) {
            case CUSTOMER -> EnumSet.of(ConversationType.SUPPORT_CUSTOMER, ConversationType.RIDE_CHAT);
            case DRIVER -> EnumSet.of(ConversationType.SUPPORT_DRIVER, ConversationType.RIDE_CHAT);
            case ADMIN -> EnumSet.of(ConversationType.SUPPORT_ADMIN);
            case SUPPORT_AGENT -> EnumSet.of(
                ConversationType.SUPPORT_CUSTOMER,
                ConversationType.SUPPORT_DRIVER,
                ConversationType.SUPPORT_ADMIN
            );
        };
    }

    private Set<Role> resolveSearchableRoles(User currentUser) {
        return currentUser.getRole() == Role.ADMIN
            ? EnumSet.of(Role.SUPPORT_AGENT, Role.ADMIN)
            : EnumSet.of(Role.CUSTOMER, Role.DRIVER, Role.ADMIN, Role.SUPPORT_AGENT);
    }

    private User findSupportStaffAssignee() {
        return userRepository.findByRole(Role.SUPPORT_AGENT).stream().findFirst()
            .orElseGet(() -> userRepository.findByRole(Role.ADMIN).stream().findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No support staff are available")));
    }

    private User resolveRequiredParticipant(Long participantUserId) {
        if (participantUserId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A participant is required for this thread");
        }
        return userRepository.findById(participantUserId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Participant not found"));
    }

    private void validateParticipantForThreadType(User participant, ConversationType threadType, Role actorRole) {
        if (threadType == ConversationType.SUPPORT_CUSTOMER && participant.getRole() != Role.CUSTOMER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Customer threads must target a customer");
        }
        if (threadType == ConversationType.SUPPORT_DRIVER && participant.getRole() != Role.DRIVER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Driver threads must target a driver");
        }
        if (threadType == ConversationType.SUPPORT_ADMIN) {
            if (actorRole == Role.ADMIN && participant.getRole() != Role.SUPPORT_AGENT) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Admins can only open support-admin threads with support agents");
            }
            if (actorRole == Role.SUPPORT_AGENT && participant.getRole() != Role.ADMIN) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Support-admin threads must target an admin");
            }
        }
    }

    private Ride getAccessibleRideForActor(User actor, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ride not found"));
        return validateRideParticipation(ride, actor);
    }

    private Ride validateRideParticipation(Ride ride, User actor) {
        if (ride == null) {
            return null;
        }
        boolean allowed = switch (actor.getRole()) {
            case CUSTOMER -> ride.getCustomer() != null && ride.getCustomer().getId().equals(actor.getId());
            case DRIVER -> ride.getRider() != null && ride.getRider().getId().equals(actor.getId());
            case SUPPORT_AGENT, ADMIN -> true;
        };
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not allowed to link this ride");
        }
        return ride;
    }

    private void validateRideParticipantIfPresent(Ride ride, User participant) {
        if (ride == null || participant == null) {
            return;
        }
        boolean valid = Objects.equals(ride.getCustomer() != null ? ride.getCustomer().getId() : null, participant.getId())
            || Objects.equals(ride.getRider() != null ? ride.getRider().getId() : null, participant.getId());
        if (!valid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "The selected ride does not belong to the chosen participant");
        }
    }

    private User resolveHandlingSupportActor(Conversation thread) {
        if (thread.getSupportAgent() != null) {
            return thread.getSupportAgent();
        }

        SupportTicket ticket = thread.getSupportTicket();
        if (ticket != null
            && ticket.getAssignedTo() != null
            && (ticket.getAssignedTo().getRole() == Role.SUPPORT_AGENT || ticket.getAssignedTo().getRole() == Role.ADMIN)) {
            return ticket.getAssignedTo();
        }

        if (thread.getParticipant1() != null
            && (thread.getParticipant1().getRole() == Role.SUPPORT_AGENT || thread.getParticipant1().getRole() == Role.ADMIN)) {
            return thread.getParticipant1();
        }

        if (thread.getParticipant2() != null
            && (thread.getParticipant2().getRole() == Role.SUPPORT_AGENT || thread.getParticipant2().getRole() == Role.ADMIN)) {
            return thread.getParticipant2();
        }

        return null;
    }

    private User resolveSupportAgentParticipant(User first, User second) {
        if (first != null && first.getRole() == Role.SUPPORT_AGENT) {
            return first;
        }
        if (second != null && second.getRole() == Role.SUPPORT_AGENT) {
            return second;
        }
        return null;
    }

    private void updateHandlingSupportActor(Conversation thread, User actor) {
        if (actor == null || actor.getRole() != Role.SUPPORT_AGENT) {
            return;
        }

        boolean conversationChanged = thread.getSupportAgent() == null || !thread.getSupportAgent().getId().equals(actor.getId());
        if (conversationChanged) {
            thread.setSupportAgent(actor);
            thread.setUpdatedAt(Instant.now());
            conversationRepository.save(thread);
        }

        SupportTicket ticket = thread.getSupportTicket();
        if (ticket != null && (ticket.getAssignedTo() == null || !ticket.getAssignedTo().getId().equals(actor.getId()))) {
            ticket.setAssignedTo(actor);
            ticket.setUpdatedAt(Instant.now());
            supportTicketRepository.save(ticket);
        }
    }

    private String normalizeSearch(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean matchesSearch(Conversation thread, User currentUser, String normalizedSearch) {
        if (normalizedSearch == null) {
            return true;
        }

        SupportTicket ticket = thread.getSupportTicket();
        User counterpart = resolveCounterpart(thread, currentUser);
        return contains(thread.getSubject(), normalizedSearch)
            || contains(ticket != null ? ticket.getDescription() : null, normalizedSearch)
            || contains(counterpart != null ? fullName(counterpart) : null, normalizedSearch)
            || contains(counterpart != null ? counterpart.getPhoneNumber() : null, normalizedSearch)
            || contains(ticket != null ? String.valueOf(ticket.getId()) : null, normalizedSearch);
    }

    private boolean contains(String raw, String normalizedSearch) {
        return raw != null && raw.toLowerCase(Locale.ROOT).contains(normalizedSearch);
    }

    private Long extractRideId(Conversation thread) {
        if (thread.getRide() != null) {
            return thread.getRide().getId();
        }
        return thread.getSupportTicket() != null ? thread.getSupportTicket().getRideId() : null;
    }

    private List<Conversation> listVisibleThreads(User currentUser, Collection<ConversationType> allowedTypes) {
        if (currentUser.getRole() == Role.SUPPORT_AGENT || currentUser.getRole() == Role.ADMIN) {
            return conversationRepository.findVisibleThreadsByType(allowedTypes);
        }
        return conversationRepository.findAccessibleThreads(currentUser, allowedTypes);
    }

    private boolean matchesUser(User candidate, String normalizedQuery) {
        return contains(fullName(candidate), normalizedQuery)
            || contains(candidate.getPhoneNumber(), normalizedQuery)
            || contains(candidate.getEmail(), normalizedQuery);
    }

    private String truncate(String value) {
        if (value == null || value.length() <= 140) {
            return value;
        }
        return value.substring(0, 137) + "...";
    }

    private void notifyThreadChanged(Conversation thread, String type) {
        realtimePublisher.publishConversationUpdate(thread.getId(), type, Map.of("threadId", thread.getId()));
        notifyInboxParticipants(thread, type);
    }

    private void notifyInboxParticipants(Conversation thread, String type) {
        Set<Long> userIds = new LinkedHashSet<>();
        addUserId(userIds, thread.getParticipant1());
        addUserId(userIds, thread.getParticipant2());
        addUserId(userIds, thread.getSupportAgent());
        if (thread.getSupportTicket() != null) {
            addUserId(userIds, thread.getSupportTicket().getAssignedTo());
        }
        if (thread.getConversationType() == ConversationType.SUPPORT_CUSTOMER
            || thread.getConversationType() == ConversationType.SUPPORT_DRIVER) {
            userRepository.findByRole(Role.SUPPORT_AGENT).forEach(user -> addUserId(userIds, user));
        }
        if (thread.getConversationType() == ConversationType.SUPPORT_ADMIN) {
            userRepository.findByRole(Role.SUPPORT_AGENT).forEach(user -> addUserId(userIds, user));
            userRepository.findByRole(Role.ADMIN).forEach(user -> addUserId(userIds, user));
        }
        for (Long userId : userIds) {
            realtimePublisher.publishChatInboxUpdate(userId, Map.of("type", type, "threadId", thread.getId()));
        }
    }

    private void addUserId(Set<Long> userIds, User user) {
        if (user != null) {
            userIds.add(user.getId());
        }
    }

    private record ThreadCreationContext(
        ConversationType threadType,
        User participant,
        User assignedTo,
        Ride ride
    ) {
    }
}
