/**
 * @fileoverview UI component module for support chat launchers.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowLeft,
  FiArrowUp,
  FiCheckCircle,
  FiHeadphones,
  FiMessageSquare,
  FiPlus,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiSlash,
  FiTruck,
  FiUser,
  FiX
} from "react-icons/fi";
import {
  closeChatThread,
  createChatThread,
  getChatMessages,
  getChatThreads,
  getChatUnreadSummary,
  markThreadRead,
  reopenChatThread,
  resolveChatThread,
  searchChatParticipants,
  sendChatMessage
} from "../features/chat/chatApi";
import { useAuth } from "../hooks/useAuth";
import { connectRealtimeSocket } from "../lib/socket";
import { Badge, Button, LoadingSpinner, Modal } from "./UIComponents";

const THREAD_TYPE_META = {
  SUPPORT_CUSTOMER: {
    label: "Customer",
    icon: FiUser,
    badgeVariant: "teal"
  },
  SUPPORT_DRIVER: {
    label: "Driver",
    icon: FiTruck,
    badgeVariant: "orange"
  },
  SUPPORT_ADMIN: {
    label: "Admin",
    icon: FiShield,
    badgeVariant: "info"
  }
};

const STATUS_META = {
  OPEN: { label: "Open", variant: "success", icon: FiMessageSquare },
  REOPENED: { label: "Reopened", variant: "warning", icon: FiRotateCcw },
  CLOSED: { label: "Closed", variant: "default", icon: FiSlash },
  RESOLVED: { label: "Resolved", variant: "teal", icon: FiCheckCircle }
};

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "REOPENED", label: "Reopened" },
  { key: "CLOSED", label: "Closed" },
  { key: "RESOLVED", label: "Resolved" }
];

const TICKET_TYPE_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "DISPUTE", label: "Dispute" },
  { value: "PAYMENT_CONFLICT", label: "Payment Conflict" },
  { value: "DRIVER_EDIT_REQUEST", label: "Driver Edit Request" }
];

const LANE_CONFIGS = {
  CUSTOMER: [
    {
      id: "customer-support",
      title: "Support",
      subtitle: "Customer care",
      threadTypes: ["SUPPORT_CUSTOMER"],
      createThreadTypes: ["SUPPORT_CUSTOMER"],
      position: "right",
      accent: "from-teal-600 to-orange-500",
      panelAccent: "from-teal-600 via-teal-700 to-slate-900",
      icon: FiHeadphones,
      countFromSummary: (summary) => summary?.supportCustomerUnread || 0
    }
  ],
  DRIVER: [
    {
      id: "driver-support",
      title: "Driver Support",
      subtitle: "Operations desk",
      threadTypes: ["SUPPORT_DRIVER"],
      createThreadTypes: ["SUPPORT_DRIVER"],
      position: "right",
      accent: "from-orange-500 to-slate-900",
      panelAccent: "from-orange-500 via-orange-600 to-slate-900",
      icon: FiHeadphones,
      countFromSummary: (summary) => summary?.supportDriverUnread || 0
    }
  ],
  SUPPORT_AGENT: [
    {
      id: "support-primary",
      title: "Support Inbox",
      subtitle: "Customers and drivers",
      threadTypes: ["SUPPORT_CUSTOMER", "SUPPORT_DRIVER"],
      createThreadTypes: ["SUPPORT_CUSTOMER", "SUPPORT_DRIVER"],
      position: "right",
      accent: "from-teal-600 to-orange-500",
      panelAccent: "from-teal-600 via-teal-700 to-slate-900",
      icon: FiHeadphones,
      countFromSummary: (summary) => (summary?.supportCustomerUnread || 0) + (summary?.supportDriverUnread || 0)
    },
    {
      id: "support-admin",
      title: "Admin Desk",
      subtitle: "Escalations only",
      threadTypes: ["SUPPORT_ADMIN"],
      createThreadTypes: ["SUPPORT_ADMIN"],
      position: "left",
      accent: "from-slate-900 to-amber-500",
      panelAccent: "from-slate-900 via-slate-800 to-amber-500",
      icon: FiShield,
      countFromSummary: (summary) => summary?.supportAdminUnread || 0
    }
  ],
  ADMIN: [
    {
      id: "admin-support",
      title: "Support Desk",
      subtitle: "Support to admin",
      threadTypes: ["SUPPORT_ADMIN"],
      createThreadTypes: ["SUPPORT_ADMIN"],
      position: "right",
      accent: "from-slate-900 to-amber-500",
      panelAccent: "from-slate-900 via-slate-800 to-amber-500",
      icon: FiShield,
      countFromSummary: (summary) => summary?.supportAdminUnread || 0
    }
  ]
};

function formatTimestamp(value) {
  if (!value) {
    return "No activity yet";
  }
  return new Date(value).toLocaleString();
}

function formatShortTimestamp(value) {
  if (!value) {
    return "No activity";
  }

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getParticipantRoles(threadType, role) {
  if (threadType === "SUPPORT_CUSTOMER") {
    return ["CUSTOMER"];
  }
  if (threadType === "SUPPORT_DRIVER") {
    return ["DRIVER"];
  }
  return role === "ADMIN" ? ["SUPPORT_AGENT"] : ["ADMIN"];
}

function matchesSearch(thread, searchTerm) {
  if (!searchTerm) {
    return true;
  }
  const haystack = [
    thread.subject,
    thread.description,
    thread.participant?.fullName,
    thread.participant?.phoneNumber,
    thread.lastMessagePreview,
    thread.ticketId
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
}

function getThreadTypeLabel(threadType) {
  return THREAD_TYPE_META[threadType]?.label || "Support";
}

function NewTicketModal({ isOpen, onClose, onCreated, lane, role }) {
  const queryClient = useQueryClient();
  const [threadType, setThreadType] = useState(lane.createThreadTypes[0]);
  const [ticketType, setTicketType] = useState("GENERAL");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participant, setParticipant] = useState(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [rideId, setRideId] = useState("");
  const deferredSearch = useDeferredValue(participantSearch);
  const needsParticipant = role === "SUPPORT_AGENT" || role === "ADMIN";
  const participantRoles = getParticipantRoles(threadType, role);

  useEffect(() => {
    if (!isOpen) {
      setThreadType(lane.createThreadTypes[0]);
      setTicketType("GENERAL");
      setParticipantSearch("");
      setParticipant(null);
      setSubject("");
      setDescription("");
      setRideId("");
    }
  }, [isOpen, lane.createThreadTypes]);

  useEffect(() => {
    setParticipant(null);
  }, [threadType]);

  const participantsQuery = useQuery({
    queryKey: ["chat-participants", role, threadType, deferredSearch],
    queryFn: () => searchChatParticipants({ roles: participantRoles, search: deferredSearch }),
    enabled: isOpen && needsParticipant
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createChatThread({
        threadType,
        participantUserId: participant?.userId || null,
        rideId: rideId ? Number(rideId) : null,
        ticketType,
        subject: subject.trim(),
        description: description.trim()
      }),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
      onCreated(thread);
    }
  });

  const canSubmit =
    subject.trim() &&
    description.trim() &&
    (!needsParticipant || participant);

  return (
    <Modal
      isOpen={isOpen}
      title="New Support Thread"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={createMutation.isPending} disabled={!canSubmit} onClick={() => createMutation.mutate()}>
            Create Thread
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {lane.createThreadTypes.length > 1 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Conversation Type</label>
            <select
              value={threadType}
              onChange={(event) => setThreadType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {lane.createThreadTypes.map((type) => (
                <option key={type} value={type}>
                  {getThreadTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        )}

        {threadType !== "SUPPORT_ADMIN" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ticket Type</label>
            <select
              value={ticketType}
              onChange={(event) => setTicketType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            >
              {TICKET_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {needsParticipant && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Pick Participant</label>
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                <input
                  value={participantSearch}
                  onChange={(event) => setParticipantSearch(event.target.value)}
                  placeholder={`Search ${getThreadTypeLabel(threadType).toLowerCase()} users`}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                />
              </div>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {participantsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : !(participantsQuery.data || []).length ? (
                <p className="text-sm text-slate-500">No matching users yet.</p>
              ) : (
                (participantsQuery.data || []).map((option) => (
                  <button
                    type="button"
                    key={option.userId}
                    onClick={() => setParticipant(option)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      participant?.userId === option.userId
                        ? "border-teal-500 bg-white shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{option.fullName}</p>
                        <p className="text-xs text-slate-500">{option.phoneNumber}</p>
                      </div>
                      <Badge label={option.role} size="sm" variant="info" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="What does this thread cover?"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Issue Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue clearly so the thread starts with the right context."
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Related Ride ID (optional)</label>
          <input
            type="number"
            value={rideId}
            onChange={(event) => setRideId(event.target.value)}
            placeholder="Attach a ride when this thread is ride-specific"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        {createMutation.isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {createMutation.error?.response?.data?.message || "Unable to create the thread right now."}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ThreadListItem({ thread, active, onSelect }) {
  const threadMeta = THREAD_TYPE_META[thread.threadType] || THREAD_TYPE_META.SUPPORT_CUSTOMER;
  const statusMeta = STATUS_META[thread.status] || STATUS_META.OPEN;
  const ThreadIcon = threadMeta.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
        active
          ? "border-teal-500 bg-white shadow-[0_16px_38px_-24px_rgba(15,118,110,0.5)]"
          : "border-slate-200 bg-white/90 hover:border-slate-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <ThreadIcon />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{thread.subject}</p>
              <p className="truncate text-xs text-slate-500">
                {thread.participant?.fullName || "Support thread"} • Ticket #{thread.ticketId}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {thread.unreadCount > 0 && (
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
              {thread.unreadCount}
            </span>
          )}
          <span className="text-[11px] text-slate-400">{formatShortTimestamp(thread.lastMessageAt || thread.updatedAt)}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge label={threadMeta.label} size="sm" variant={threadMeta.badgeVariant} />
        <Badge label={statusMeta.label} size="sm" variant={statusMeta.variant} />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-slate-600">
        {thread.lastMessagePreview || thread.description || "No messages yet."}
      </p>
    </button>
  );
}

function ThreadConversation({
  thread,
  messages,
  currentUserId,
  counterpartUserId,
  isLoading,
  draft,
  onDraftChange,
  onSend,
  sendPending,
  onCloseThread,
  onResolveThread,
  onReopenThread,
  onBackToThreads
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex h-full items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
        Pick a thread to open the conversation.
      </div>
    );
  }

  const statusMeta = STATUS_META[thread.status] || STATUS_META.OPEN;
  const typeMeta = THREAD_TYPE_META[thread.threadType] || THREAD_TYPE_META.SUPPORT_CUSTOMER;
  const TypeIcon = typeMeta.icon;
  const canSend = thread.permissions?.canReply && draft.trim() && !sendPending;

  return (
    <div className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_32px_70px_-40px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(255,255,255,0.98))] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToThreads}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                aria-label="Back to threads"
              >
                <FiArrowLeft />
              </button>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <TypeIcon />
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-900">{thread.subject}</p>
                <p className="truncate text-sm text-slate-500">
                  {thread.participant?.fullName || "Support thread"} • Ticket #{thread.ticketId}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge label={typeMeta.label} size="sm" variant={typeMeta.badgeVariant} />
              <Badge label={statusMeta.label} size="sm" variant={statusMeta.variant} />
              {thread.rideId && <Badge label={`Ride ${thread.rideId}`} size="sm" variant="orange" />}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {thread.permissions?.canClose && (thread.status === "OPEN" || thread.status === "REOPENED") && (
              <Button size="sm" variant="secondary" onClick={onCloseThread}>
                Close
              </Button>
            )}
            {thread.permissions?.canResolve && (thread.status === "OPEN" || thread.status === "REOPENED") && (
              <Button size="sm" onClick={onResolveThread}>
                Resolve
              </Button>
            )}
            {thread.permissions?.canReopen && (thread.status === "CLOSED" || thread.status === "RESOLVED") && (
              <Button size="sm" variant="secondary" onClick={onReopenThread}>
                Reopen
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-3 text-xs text-slate-500 md:grid-cols-2">
          <p>Last activity: {formatTimestamp(thread.lastMessageAt || thread.updatedAt)}</p>
          <p>Closed at: {thread.closedAt ? formatTimestamp(thread.closedAt) : "Still open"}</p>
        </div>
        {thread.autoClosedAt && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This thread was auto-closed after 100 hours of inactivity on {formatTimestamp(thread.autoClosedAt)}.
          </div>
        )}
        {thread.description && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {thread.description}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-5 py-5">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : !(messages || []).length ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-6 text-center text-sm text-slate-500">
            No messages yet. Start with a clear update so the thread has context.
          </div>
        ) : (
          <MessageFeed
            messages={messages}
            currentUserId={currentUserId}
            counterpartUserId={counterpartUserId}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        className="border-t border-slate-200 bg-white px-5 py-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        {thread.permissions?.canReply ? (
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                  return;
                }
                event.preventDefault();
                if (canSend) {
                  onSend();
                }
              }}
              placeholder="Write a clear reply..."
              className="min-h-[3.5rem] flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-[0_18px_30px_-20px_rgba(13,148,136,0.9)] transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:cursor-not-allowed disabled:bg-teal-300"
              aria-label="Send message"
            >
              {sendPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              ) : (
                <FiArrowUp className="text-lg" />
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {thread.status === "CLOSED" || thread.status === "RESOLVED"
              ? "Replies are disabled while this thread is closed. Reopen it or start a new ticket if you need follow-up."
              : "You do not have permission to reply in this thread."}
          </div>
        )}
      </form>
    </div>
  );
}

function MessageFeed({ messages, currentUserId, counterpartUserId }) {
  return (
    <div className="space-y-3">
      {(messages || []).map((message) => {
        if (message.systemMessage) {
          return (
            <div key={message.id} className="flex justify-center">
              <div className="max-w-xl rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs text-slate-500 shadow-sm">
                {message.content}
              </div>
            </div>
          );
        }

        const mine = message.sender?.userId === currentUserId;
        const counterpart = message.sender?.userId === counterpartUserId;
        const bubbleClass = mine
          ? "bg-teal-600 text-white"
          : counterpart
            ? "border border-slate-200 bg-white text-slate-900"
            : "border border-amber-200 bg-amber-50 text-slate-900";

        return (
          <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] rounded-[22px] px-4 py-3 shadow-sm ${bubbleClass}`}>
              <p className={`text-xs font-semibold ${mine ? "text-teal-100" : "text-slate-500"}`}>
                {message.sender?.fullName || "System"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
              <p className={`mt-2 text-[11px] ${mine ? "text-teal-100" : "text-slate-400"}`}>
                {formatTimestamp(message.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatLauncher({ lane, role, unreadCount }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [draft, setDraft] = useState("");
  const { session } = useAuth();

  const threadsQuery = useQuery({
    queryKey: ["chat-threads", lane.id, lane.threadTypes.join(",")],
    queryFn: () => getChatThreads({ threadTypes: lane.threadTypes }),
    refetchInterval: isOpen ? 20000 : 30000
  });

  useEffect(() => {
    if (!isOpen || !selectedThreadId) {
      return () => {};
    }

    const disconnect = connectRealtimeSocket({
      conversationIds: [selectedThreadId],
      onConversationUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedThreadId] });
        queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
        queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
      }
    });

    return disconnect;
  }, [isOpen, queryClient, selectedThreadId]);

  const visibleThreads = useMemo(() => {
    return (threadsQuery.data || []).filter((thread) => {
      const matchesStatus = statusFilter === "ALL" ? true : thread.status === statusFilter;
      return matchesStatus && matchesSearch(thread, searchTerm);
    });
  }, [searchTerm, statusFilter, threadsQuery.data]);

  useEffect(() => {
    if (selectedThreadId && !visibleThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(null);
    }
  }, [selectedThreadId, visibleThreads]);

  const selectedThread = (threadsQuery.data || []).find((thread) => thread.id === selectedThreadId) || null;

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", selectedThreadId],
    queryFn: () => getChatMessages(selectedThreadId),
    enabled: Boolean(isOpen && selectedThreadId),
    refetchInterval: isOpen && selectedThreadId ? 15000 : false
  });

  useEffect(() => {
    if (!isOpen || !selectedThreadId || !messagesQuery.data) {
      return;
    }
    markThreadRead(selectedThreadId).catch(() => {});
  }, [isOpen, messagesQuery.data, selectedThreadId]);

  const sendMutation = useMutation({
    mutationFn: () => sendChatMessage(selectedThreadId, draft.trim()),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedThreadId] });
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
    }
  });

  const closeMutation = useMutation({
    mutationFn: (payload) => closeChatThread(selectedThreadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: (payload) => resolveChatThread(selectedThreadId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
    }
  });

  const reopenMutation = useMutation({
    mutationFn: () => reopenChatThread(selectedThreadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
    }
  });

  const Icon = lane.icon;

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setSelectedThreadId(null);
            setIsOpen(true);
          }}
          className={`fixed bottom-24 md:bottom-6 ${lane.position === "left" ? "left-4 md:left-6" : "right-4 md:right-6"} z-[75] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${lane.accent} text-white shadow-[0_24px_45px_-24px_rgba(15,23,42,0.7)] transition hover:scale-[1.03] focus:outline-none focus:ring-4 focus:ring-white/60`}
          aria-label={lane.title}
        >
          <Icon className="text-2xl" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex min-w-7 items-center justify-center rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-900 shadow-md">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/45 backdrop-blur-[2px]">
          <div
            className={`absolute inset-y-4 ${lane.position === "left" ? "left-4 justify-start" : "right-4 justify-end"} flex w-[calc(100%-2rem)] sm:inset-y-6 sm:w-[calc(100%-3rem)] ${lane.position === "left" ? "sm:left-6" : "sm:right-6"}`}
          >
            <div className="flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,rgba(241,245,249,0.98),rgba(255,255,255,0.98))] shadow-2xl">
              <div className={`bg-gradient-to-r ${lane.panelAccent} px-5 py-4 text-white`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{lane.subtitle}</p>
                    <h2 className="mt-1 text-2xl font-semibold">{lane.title}</h2>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setShowNewTicketModal(true)}>
                      <FiPlus />
                      New Ticket
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setSelectedThreadId(null);
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/15"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 p-4">
                {selectedThread ? (
                  <ThreadConversation
                    thread={selectedThread}
                    messages={messagesQuery.data || []}
                    currentUserId={session?.userId}
                    counterpartUserId={selectedThread?.participant?.userId}
                    isLoading={messagesQuery.isLoading}
                    draft={draft}
                    onDraftChange={setDraft}
                    onSend={() => {
                      if (!draft.trim()) {
                        return;
                      }
                      sendMutation.mutate();
                    }}
                    sendPending={sendMutation.isPending}
                    onCloseThread={() => {
                      const resolutionNotes = window.prompt("Add closing notes if needed. Leave blank to close without notes.");
                      if (resolutionNotes === null) {
                        return;
                      }
                      closeMutation.mutate({ resolutionNotes });
                    }}
                    onResolveThread={() => {
                      const resolutionNotes = window.prompt("Add resolution notes before marking this thread resolved.");
                      if (resolutionNotes === null) {
                        return;
                      }
                      resolveMutation.mutate({ resolutionNotes });
                    }}
                    onReopenThread={() => reopenMutation.mutate()}
                    onBackToThreads={() => setSelectedThreadId(null)}
                  />
                ) : (
                  <div className="flex h-full min-h-[32rem] flex-col rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_30px_65px_-45px_rgba(15,23,42,0.55)]">
                    <div className="relative">
                      <FiSearch className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search subject, ticket, participant"
                        className="w-full rounded-2xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {STATUS_FILTERS.map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setStatusFilter(filter.key)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            statusFilter === filter.key
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto space-y-3 pr-1">
                      {threadsQuery.isLoading ? (
                        <div className="flex h-40 items-center justify-center">
                          <LoadingSpinner />
                        </div>
                      ) : threadsQuery.isError ? (
                        <div className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                          {threadsQuery.error?.response?.data?.message || "Unable to load threads right now."}
                        </div>
                      ) : !visibleThreads.length ? (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                          No threads match the current filters. Start a new ticket to open a fresh support thread.
                        </div>
                      ) : (
                        visibleThreads.map((thread) => (
                          <ThreadListItem
                            key={thread.id}
                            thread={thread}
                            active={false}
                            onSelect={() => setSelectedThreadId(thread.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <NewTicketModal
        isOpen={showNewTicketModal}
        onClose={() => setShowNewTicketModal(false)}
        lane={lane}
        role={role}
        onCreated={(thread) => {
          setShowNewTicketModal(false);
          setIsOpen(true);
          setSelectedThreadId(thread.id);
          queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
          queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
        }}
      />
    </>
  );
}

export default function SupportChatLaunchers() {
  const queryClient = useQueryClient();
  const { role, session } = useAuth();
  const lanes = useMemo(() => (role ? LANE_CONFIGS[role] || [] : []), [role]);

  const unreadSummaryQuery = useQuery({
    queryKey: ["chat-unread-summary"],
    queryFn: getChatUnreadSummary,
    enabled: Boolean(role && session?.userId),
    refetchInterval: 30000
  });

  useEffect(() => {
    if (!session?.userId || !lanes.length) {
      return () => {};
    }

    const disconnect = connectRealtimeSocket({
      userId: session.userId,
      onChatInboxUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["chat-unread-summary"] });
        queryClient.invalidateQueries({ queryKey: ["chat-threads"] });
      }
    });

    return disconnect;
  }, [lanes.length, queryClient, session?.userId]);

  if (!lanes.length || !session?.userId) {
    return null;
  }

  return (
    <>
      {lanes.map((lane) => (
        <ChatLauncher
          key={lane.id}
          lane={lane}
          role={role}
          unreadCount={lane.countFromSummary(unreadSummaryQuery.data)}
        />
      ))}
    </>
  );
}
