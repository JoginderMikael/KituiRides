/**
 * @fileoverview Page component for support workspace.
 */
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCreditCard,
  FiHeadphones,
  FiHome,
  FiInbox,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiZap
} from "react-icons/fi";
import {
  AppHeader,
  CompactStatCard,
  PrimaryActionButton,
  SectionCard,
  StatusPill
} from "../components/RideAppPrimitives";
import { Badge, Button, EmptyState, Input, LoadingSpinner } from "../components/UIComponents";
import { getChatUnreadSummary } from "../features/chat/chatApi";
import {
  approveCashPayment,
  getRidePayment,
  initiateMpesaPayment,
  promptCustomerMpesaPayment
} from "../features/rides/paymentApi";
import {
  fixRideKms,
  forceApprovePayment,
  getSupportRide,
  replyTicket,
  resolveRide,
  supportTickets,
  updateTicket
} from "../features/support/supportApi";
import { useAuth } from "../hooks/useAuth";
import { rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

const TICKET_STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED"];
const QUEUE_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"];

const selectClassName =
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

const SUPPORT_VIEW_OPTIONS = [
  {
    value: "home",
    label: "Overview",
    description: "Summaries and shift pulse",
    icon: FiHome
  },
  {
    value: "queue",
    label: "Support Queue",
    description: "Open and assigned tickets",
    icon: FiInbox
  },
  {
    value: "case",
    label: "Case Workspace",
    description: "Replies, notes, ownership",
    icon: FiShield
  },
  {
    value: "ride",
    label: "Ride Investigation",
    description: "Ride and payment tools",
    icon: FiMapPin
  },
  {
    value: "messaging",
    label: "Messaging",
    description: "Support and admin lanes",
    icon: FiHeadphones
  }
];

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function formatDistance(value) {
  return `${Number(value || 0).toFixed(2)} km`;
}

function formatTimestamp(value) {
  if (!value) {
    return "Waiting for update";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function labelForTicketStatus(status) {
  const labels = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved"
  };
  return labels[status] || status;
}

function labelForTicketType(ticketType) {
  const labels = {
    GENERAL: "General",
    DISPUTE: "Dispute",
    PAYMENT_CONFLICT: "Payment Conflict",
    DRIVER_EDIT_REQUEST: "Driver Edit Request"
  };
  return labels[ticketType] || ticketType;
}

function ticketStatusVariant(status) {
  if (status === "RESOLVED") {
    return "success";
  }
  if (status === "IN_PROGRESS") {
    return "warning";
  }
  return "info";
}

function ticketTypeVariant(ticketType) {
  if (ticketType === "DISPUTE") {
    return "error";
  }
  if (ticketType === "PAYMENT_CONFLICT") {
    return "warning";
  }
  if (ticketType === "DRIVER_EDIT_REQUEST") {
    return "info";
  }
  return "default";
}

function paymentVariant(status) {
  if (status === "SUCCESS") {
    return "success";
  }
  if (status === "FAILED") {
    return "error";
  }
  return "warning";
}

function toMpesaPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return "";
  }
  if (phoneNumber.startsWith("254")) {
    return phoneNumber;
  }
  if (phoneNumber.startsWith("+254")) {
    return phoneNumber.slice(1);
  }
  if (phoneNumber.startsWith("0")) {
    return `254${phoneNumber.slice(1)}`;
  }
  return phoneNumber;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function matchesTicket(ticket, searchTerm) {
  if (!searchTerm) {
    return true;
  }
  const haystack = [
    ticket.subject,
    ticket.description,
    ticket.ticketType,
    ticket.status,
    ticket.rideId
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
}

function DetailRow({ label, value, emphasis = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={emphasis ? "font-semibold text-slate-950" : "font-medium text-slate-700"}>{value}</span>
    </div>
  );
}

function NoticeBanner({ notice }) {
  if (!notice) {
    return null;
  }

  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900"
  };

  return (
    <div className={`rounded-[24px] border px-4 py-3 text-sm ${styles[notice.tone] || styles.info}`}>
      {notice.message}
    </div>
  );
}

function TicketQueueItem({ ticket, active, ownedByCurrentAgent, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        active
          ? "border-teal-500 bg-teal-50 shadow-[0_18px_36px_-28px_rgba(13,148,136,0.8)]"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{ticket.subject}</p>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ticket.description}</p>
        </div>
        <Badge label={labelForTicketStatus(ticket.status)} variant={ticketStatusVariant(ticket.status)} size="sm" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge label={labelForTicketType(ticket.ticketType)} variant={ticketTypeVariant(ticket.ticketType)} size="sm" />
        {ticket.rideId ? <Badge label={`Ride #${ticket.rideId}`} variant="orange" size="sm" /> : null}
        <Badge label={ownedByCurrentAgent ? "Assigned to you" : "Unassigned"} variant={ownedByCurrentAgent ? "teal" : "default"} size="sm" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{ticket.replies?.length || 0} replies</span>
        <span>{formatTimestamp(ticket.createdAt)}</span>
      </div>
    </button>
  );
}

function SupportLaneSummary({ unreadSummary }) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Support Messaging</h2>
          <p className="mt-1 text-sm text-slate-500">Customer and driver threads stay on the right launcher. Admin escalations stay on the left.</p>
        </div>
        <StatusPill
          label={`${unreadSummary?.totalUnread || 0} unread`}
          tone={(unreadSummary?.totalUnread || 0) > 0 ? "warning" : "muted"}
        />
      </div>

      <div className="space-y-3">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-teal-700">
                <FiHeadphones />
              </div>
              <div>
                <p className="font-semibold text-slate-950">Support Inbox</p>
                <p className="text-sm text-slate-500">Customers and drivers</p>
              </div>
            </div>
            <Badge
              label={String((unreadSummary?.supportCustomerUnread || 0) + (unreadSummary?.supportDriverUnread || 0))}
              variant="teal"
              size="sm"
            />
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700">
                <FiShield />
              </div>
              <div>
                <p className="font-semibold text-slate-950">Admin Desk</p>
                <p className="text-sm text-slate-500">Escalations and staff coordination</p>
              </div>
            </div>
            <Badge label={String(unreadSummary?.supportAdminUnread || 0)} variant="info" size="sm" />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function SupportWorkspaceNav({ activeView, onChange, stats, selectedTicket, activeRideId, unreadSummary }) {
  const badges = {
    home: `${stats.queue} live`,
    queue: String(stats.queue),
    case: selectedTicket ? `#${selectedTicket.id}` : "None",
    ride: activeRideId ? `#${activeRideId}` : "Search",
    messaging: String(unreadSummary?.totalUnread || 0)
  };

  return (
    <SectionCard className="space-y-4 xl:sticky xl:top-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Navigation</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">Support desk</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Choose one work mode at a time so the main workspace stays focused.</p>
      </div>

      <nav aria-label="Support workspace navigation" className="space-y-2">
        {SUPPORT_VIEW_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = activeView === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`flex w-full items-start gap-3 rounded-[22px] border px-4 py-3 text-left transition ${
                active
                  ? "border-teal-500 bg-teal-50 shadow-[0_18px_36px_-30px_rgba(13,148,136,0.75)]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-white text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                <Icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className={`font-semibold ${active ? "text-teal-800" : "text-slate-950"}`}>{option.label}</span>
                  <Badge label={badges[option.value]} variant={active ? "teal" : "default"} size="sm" />
                </span>
                <span className="mt-1 block text-sm text-slate-500">{option.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Quick pulse</p>
        <div className="mt-3 space-y-3">
          <DetailRow label="My cases" value={String(stats.myCases)} emphasis />
          <DetailRow label="Payment conflicts" value={String(stats.paymentConflicts)} />
          <DetailRow label="Admin escalations" value={String(stats.escalations)} />
        </div>
      </div>
    </SectionCard>
  );
}

export default function SupportPage() {
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const [activeView, setActiveView] = useState("home");
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [queueSearch, setQueueSearch] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [rideSearchId, setRideSearchId] = useState("");
  const [activeRideId, setActiveRideId] = useState(null);
  const [ticketReply, setTicketReply] = useState("");
  const [ticketStatus, setTicketStatus] = useState("OPEN");
  const [ticketResolutionNotes, setTicketResolutionNotes] = useState("");
  const [distanceOverrideKm, setDistanceOverrideKm] = useState("");
  const [resolvedDistanceKm, setResolvedDistanceKm] = useState("");
  const [rideResolutionNotes, setRideResolutionNotes] = useState("");
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState("");
  const [notice, setNotice] = useState(null);
  const deferredQueueSearch = useDeferredValue(queueSearch);

  const ticketsQuery = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });
  const unreadSummaryQuery = useQuery({
    queryKey: ["support-chat-unread-summary"],
    queryFn: getChatUnreadSummary
  });

  const rideQuery = useQuery({
    queryKey: ["support-ride", activeRideId],
    queryFn: () => getSupportRide(activeRideId),
    enabled: Boolean(activeRideId),
    retry: false
  });

  const paymentQuery = useQuery({
    queryKey: ["support-ride-payment", activeRideId],
    queryFn: () => getRidePayment(activeRideId),
    enabled: Boolean(activeRideId),
    retry: false
  });

  const tickets = ticketsQuery.data || [];
  const unresolvedTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "RESOLVED"),
    [tickets]
  );

  const filteredTickets = useMemo(() => (
    tickets.filter((ticket) => {
      const matchesFilter = queueFilter === "ALL" ? true : ticket.status === queueFilter;
      return matchesFilter && matchesTicket(ticket, deferredQueueSearch.trim());
    })
  ), [deferredQueueSearch, queueFilter, tickets]);

  useEffect(() => {
    if (!filteredTickets.length) {
      setActiveTicketId(null);
      return;
    }
    if (!activeTicketId || !filteredTickets.some((ticket) => ticket.id === activeTicketId)) {
      setActiveTicketId(filteredTickets[0].id);
    }
  }, [activeTicketId, filteredTickets]);

  const selectedTicket = filteredTickets.find((ticket) => ticket.id === activeTicketId)
    || tickets.find((ticket) => ticket.id === activeTicketId)
    || null;

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }
    setTicketStatus(selectedTicket.status);
    setTicketResolutionNotes(selectedTicket.resolutionNotes || "");
    setTicketReply("");
    if (selectedTicket.rideId) {
      setActiveRideId(selectedTicket.rideId);
      setRideSearchId(String(selectedTicket.rideId));
    }
  }, [selectedTicket]);

  const ride = rideQuery.data || null;

  useEffect(() => {
    if (!ride?.customerPhone) {
      return;
    }
    setPaymentPhoneNumber(toMpesaPhoneNumber(ride.customerPhone));
  }, [ride?.id, ride?.customerPhone]);

  const activeAgentName = user ? `${user.firstName} ${user.lastName}` : "Support Agent";
  const myUserId = session?.userId;

  const stats = useMemo(() => ({
    queue: unresolvedTickets.length,
    myCases: tickets.filter((ticket) => ticket.assignedToUserId === myUserId && ticket.status !== "RESOLVED").length,
    disputes: tickets.filter((ticket) => ticket.ticketType === "DISPUTE").length,
    paymentConflicts: tickets.filter((ticket) => ticket.ticketType === "PAYMENT_CONFLICT").length,
    escalations: unreadSummaryQuery.data?.supportAdminUnread || 0
  }), [myUserId, tickets, unreadSummaryQuery.data?.supportAdminUnread, unresolvedTickets.length]);

  const normalizedRideSearchId = rideSearchId.trim();
  const canSearchRide = normalizedRideSearchId && !Number.isNaN(Number(normalizedRideSearchId));
  const typedDistanceOverride = parseOptionalNumber(distanceOverrideKm);
  const typedResolvedDistance = parseOptionalNumber(resolvedDistanceKm);
  const rideChargeableDistance = parseOptionalNumber(ride?.chargeableDistanceKm);
  const paymentManualDistanceKm = ride?.manualDistanceRequired
    ? rideChargeableDistance ?? typedDistanceOverride ?? typedResolvedDistance
    : undefined;
  const paymentSettled = Boolean(ride?.paymentApproved) || ride?.paymentStatus === "SUCCESS";
  const paymentRecord = paymentQuery.data || null;
  const paymentMissing = paymentQuery.error?.response?.status === 404;
  const paymentError = paymentQuery.error && !paymentMissing ? paymentQuery.error : null;
  const currentView = SUPPORT_VIEW_OPTIONS.find((option) => option.value === activeView) || SUPPORT_VIEW_OPTIONS[0];

  function openTicketWorkspace(ticket, nextView = "case") {
    setActiveTicketId(ticket.id);
    if (ticket.rideId) {
      setActiveRideId(ticket.rideId);
      setRideSearchId(String(ticket.rideId));
    }
    setActiveView(nextView);
  }

  function openRideWorkspace(rideId) {
    if (rideId) {
      setActiveRideId(rideId);
      setRideSearchId(String(rideId));
    }
    setActiveView("ride");
  }

  function setWorkspaceMessage(tone, message) {
    setNotice({ tone, message });
  }

  async function refreshWorkspace(rideId = activeRideId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["support-chat-unread-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["support-ride", rideId] }),
      queryClient.invalidateQueries({ queryKey: ["support-ride-payment", rideId] })
    ]);
  }

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }) => replyTicket(ticketId, { message }),
    onSuccess: async () => {
      setTicketReply("");
      setWorkspaceMessage("success", "Reply sent. The case is now assigned to you if it was previously unassigned.");
      await refreshWorkspace(selectedTicket?.rideId || activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to send the reply right now.");
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, payload }) => updateTicket(ticketId, payload),
    onSuccess: async () => {
      setWorkspaceMessage("success", "Ticket updated. Ownership and queue state have been refreshed.");
      await refreshWorkspace(selectedTicket?.rideId || activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to update this ticket right now.");
    }
  });

  const fixKmsMutation = useMutation({
    mutationFn: ({ rideId, kms }) => fixRideKms(rideId, kms),
    onSuccess: async () => {
      setWorkspaceMessage("success", "Ride distance updated. Payment and dispute calculations now use the corrected KM.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to update ride distance right now.");
    }
  });

  const resolveRideMutation = useMutation({
    mutationFn: ({ rideId, payload }) => resolveRide(rideId, payload),
    onSuccess: async () => {
      setRideResolutionNotes("");
      setResolvedDistanceKm("");
      setWorkspaceMessage("success", "Ride resolved and the support queue has been refreshed.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to resolve this ride right now.");
    }
  });

  const forceApproveMutation = useMutation({
    mutationFn: forceApprovePayment,
    onSuccess: async () => {
      setWorkspaceMessage("success", "Payment force-approved. The ride record now reflects support intervention.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to force-approve this payment right now.");
    }
  });

  const initiateMpesaMutation = useMutation({
    mutationFn: (payload) => initiateMpesaPayment(payload),
    onSuccess: async () => {
      setWorkspaceMessage("success", "STK push sent. Ask the customer to complete the request on their phone.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to initiate M-Pesa STK push right now.");
    }
  });

  const promptMpesaMutation = useMutation({
    mutationFn: promptCustomerMpesaPayment,
    onSuccess: async () => {
      setWorkspaceMessage("success", "Registered-number M-Pesa prompt sent to the customer.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to prompt the customer for M-Pesa payment right now.");
    }
  });

  const approveCashMutation = useMutation({
    mutationFn: ({ rideId, payload }) => approveCashPayment(rideId, payload),
    onSuccess: async () => {
      setWorkspaceMessage("success", "Cash payment approved. The ride state has been refreshed.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => {
      setWorkspaceMessage("error", error?.response?.data?.message || "Unable to approve the cash settlement right now.");
    }
  });

  const homeView = (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <CompactStatCard label="Active Queue" value={String(stats.queue)} helper="Open and in-progress cases" tone={stats.queue ? "warning" : "success"} />
        <CompactStatCard label="My Cases" value={String(stats.myCases)} helper="Currently assigned to you" tone={stats.myCases ? "accent" : "muted"} />
        <CompactStatCard label="Disputes" value={String(stats.disputes)} helper="Ride issues needing resolution" tone={stats.disputes ? "danger" : "muted"} />
        <CompactStatCard label="Payment Conflicts" value={String(stats.paymentConflicts)} helper="Settlement interventions queued" tone={stats.paymentConflicts ? "warning" : "muted"} />
        <CompactStatCard label="Admin Escalations" value={String(stats.escalations)} helper="Unread support-admin threads" tone={stats.escalations ? "info" : "muted"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <SectionCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Priority Queue Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">Start here when you want the next best cases without opening the full queue first.</p>
            </div>
            <Button variant="secondary" className="rounded-2xl" onClick={() => setActiveView("queue")}>
              Open Queue
            </Button>
          </div>

          {!unresolvedTickets.length ? (
            <EmptyState
              icon="📭"
              title="No active cases"
              description="The summary board is clear right now. New tickets will appear here as they arrive."
            />
          ) : (
            <div className="space-y-3">
              {unresolvedTickets.slice(0, 3).map((ticket) => (
                <TicketQueueItem
                  key={ticket.id}
                  ticket={ticket}
                  active={ticket.id === activeTicketId}
                  ownedByCurrentAgent={ticket.assignedToUserId === myUserId}
                  onSelect={() => openTicketWorkspace(ticket, "case")}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Operational Shortcuts</h2>
            <p className="mt-1 text-sm text-slate-500">Jump into the exact workspace you need instead of juggling three tools at once.</p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setActiveView("queue")}
              className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Browse Queue</p>
                  <p className="mt-1 text-sm text-slate-500">Review open and assigned cases in one list.</p>
                </div>
                <Badge label={String(stats.queue)} variant="warning" size="sm" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("case")}
              className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Resume Case Work</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedTicket ? `Continue ticket #${selectedTicket.id}.` : "Open the active case details and ticket thread."}
                  </p>
                </div>
                <Badge label={selectedTicket ? `#${selectedTicket.id}` : "Ready"} variant="teal" size="sm" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("ride")}
              className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">Inspect Ride</p>
                  <p className="mt-1 text-sm text-slate-500">Inspect a ride, fix KM, and recover payment from one focused panel.</p>
                </div>
                <Badge label={activeRideId ? `#${activeRideId}` : "Search"} variant="orange" size="sm" />
              </div>
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
        <SupportLaneSummary unreadSummary={unreadSummaryQuery.data} />

        <SectionCard className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Current Focus</h2>
              <p className="mt-1 text-sm text-slate-500">The workspace remembers the active case and linked ride so you can jump back in quickly.</p>
            </div>
            <StatusPill
              label={selectedTicket ? "Case loaded" : "No case loaded"}
              tone={selectedTicket ? "accent" : "muted"}
              hint={selectedTicket ? `Ticket #${selectedTicket.id}` : null}
            />
          </div>

          {!selectedTicket ? (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
              Select a queue item to keep a case and its linked ride ready for quick return.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Selected case</p>
                    <p className="mt-1 font-semibold text-slate-950">{selectedTicket.subject}</p>
                    <p className="mt-2 text-sm text-slate-600">{selectedTicket.description}</p>
                  </div>
                  <Badge label={labelForTicketStatus(selectedTicket.status)} variant={ticketStatusVariant(selectedTicket.status)} size="sm" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <PrimaryActionButton className="min-h-[3.25rem] px-5" onClick={() => setActiveView("case")}>
                  Open Case Workspace
                </PrimaryActionButton>
                {selectedTicket.rideId ? (
                  <Button variant="secondary" className="rounded-2xl" onClick={() => openRideWorkspace(selectedTicket.rideId)}>
                    Open Ride Investigation
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );

  const queueView = (
    <div className="space-y-5">
      <SectionCard className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Support Queue</h2>
            <p className="mt-1 text-sm text-slate-500">Open or assigned tickets land here. Picking a case loads its ride, notes, and payment tools.</p>
          </div>
          <StatusPill
            label={`${filteredTickets.length} visible`}
            tone={filteredTickets.length ? "accent" : "muted"}
            hint={`${stats.myCases} yours`}
          />
        </div>

        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-4 top-4 text-slate-400" />
          <input
            value={queueSearch}
            onChange={(event) => setQueueSearch(event.target.value)}
            placeholder="Search subject, ride, type, or status"
            className="w-full rounded-[22px] border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUEUE_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setQueueFilter(filter)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                queueFilter === filter
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {filter === "ALL" ? "All" : labelForTicketStatus(filter)}
            </button>
          ))}
        </div>

        {ticketsQuery.isLoading ? (
          <div className="py-10">
            <LoadingSpinner />
          </div>
        ) : ticketsQuery.isError ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {ticketsQuery.error?.response?.data?.message || "Unable to load the support queue right now."}
          </div>
        ) : !filteredTickets.length ? (
          <EmptyState
            icon="📭"
            title="Queue is clear"
            description="No tickets match the current search and status filters."
          />
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <TicketQueueItem
                key={ticket.id}
                ticket={ticket}
                active={ticket.id === activeTicketId}
                ownedByCurrentAgent={ticket.assignedToUserId === myUserId}
                onSelect={() => openTicketWorkspace(ticket, "case")}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );

  const messagingView = (
    <div className="space-y-5">
      <SupportLaneSummary unreadSummary={unreadSummaryQuery.data} />

      <SectionCard className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Messaging Workflow</h2>
          <p className="mt-1 text-sm text-slate-500">Use the floating launcher on the right for customer and driver support threads. Use the launcher on the left for admin escalations.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">Support Inbox</p>
            <p className="mt-2 text-sm text-slate-500">Customer and driver conversations, unread counts, and ticket-linked context stay grouped together.</p>
            <div className="mt-4 space-y-3">
              <DetailRow label="Customer unread" value={String(unreadSummaryQuery.data?.supportCustomerUnread || 0)} />
              <DetailRow label="Driver unread" value={String(unreadSummaryQuery.data?.supportDriverUnread || 0)} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">Admin Desk</p>
            <p className="mt-2 text-sm text-slate-500">Escalations and staff coordination stay separate so agent work does not drown in admin chatter.</p>
            <div className="mt-4 space-y-3">
              <DetailRow label="Admin unread" value={String(unreadSummaryQuery.data?.supportAdminUnread || 0)} />
              <DetailRow label="Total unread" value={String(unreadSummaryQuery.data?.totalUnread || 0)} emphasis />
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
          Ownership becomes clearer as soon as you reply or update a ticket, so the launcher and the main case workspace reinforce the same “who is handling this” story.
        </div>
      </SectionCard>
    </div>
  );

  const ticketWorkspace = (
    <SectionCard className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Case Workspace</h2>
          <p className="mt-1 text-sm text-slate-500">Reply, move the ticket through the queue, and keep ownership visible while you work.</p>
        </div>
        <StatusPill
          label={selectedTicket ? labelForTicketStatus(selectedTicket.status) : "No case selected"}
          tone={selectedTicket ? (selectedTicket.status === "RESOLVED" ? "success" : selectedTicket.status === "IN_PROGRESS" ? "warning" : "info") : "muted"}
        />
      </div>

      {!selectedTicket ? (
        <EmptyState
          icon="🧩"
          title="Select a ticket"
          description="Choose a queue item to load the case summary, reply thread, and ride-linked tools."
          action={(
            <Button variant="secondary" className="rounded-2xl" onClick={() => setActiveView("queue")}>
              Open Support Queue
            </Button>
          )}
        />
      ) : (
        <>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Ticket #{selectedTicket.id}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{selectedTicket.subject}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedTicket.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge label={labelForTicketType(selectedTicket.ticketType)} variant={ticketTypeVariant(selectedTicket.ticketType)} size="sm" />
                {selectedTicket.rideId ? <Badge label={`Ride #${selectedTicket.rideId}`} variant="orange" size="sm" /> : null}
                <Badge
                  label={selectedTicket.assignedToUserId === myUserId ? "Assigned to you" : "Unassigned"}
                  variant={selectedTicket.assignedToUserId === myUserId ? "teal" : "default"}
                  size="sm"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Opened" value={formatTimestamp(selectedTicket.createdAt)} />
              <DetailRow
                label="Latest support action"
                value={selectedTicket.replies?.length ? formatTimestamp(selectedTicket.replies[selectedTicket.replies.length - 1].createdAt) : "No replies yet"}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Ownership and Status</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedTicket.assignedToUserId === myUserId
                    ? "This case already belongs to you."
                    : "Replying or updating this ticket will claim it to your queue automatically."}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <FiShield className="text-sm" />
                {activeAgentName}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ticket Status</label>
                <select
                  value={ticketStatus}
                  onChange={(event) => setTicketStatus(event.target.value)}
                  className={selectClassName}
                >
                  {TICKET_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {labelForTicketStatus(option)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Resolution Notes</label>
                <textarea
                  rows={4}
                  value={ticketResolutionNotes}
                  onChange={(event) => setTicketResolutionNotes(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="Capture what you changed, what is pending, or how this case was resolved."
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <PrimaryActionButton
                className="min-h-[3.25rem] px-5"
                loading={updateTicketMutation.isPending}
                onClick={() =>
                  updateTicketMutation.mutate({
                    ticketId: selectedTicket.id,
                    payload: {
                      status: ticketStatus,
                      resolutionNotes: ticketResolutionNotes.trim() || null
                    }
                  })
                }
              >
                Save Queue Update
              </PrimaryActionButton>
              {selectedTicket.rideId ? (
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => openRideWorkspace(selectedTicket.rideId)}
                >
                  <FiArrowRight />
                  Open Linked Ride
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-4">
            <h3 className="text-base font-semibold text-slate-950">Reply Thread</h3>
            <p className="mt-1 text-sm text-slate-500">Support replies become part of the case record and keep the ownership trail clear.</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Case opened</p>
                  <span className="text-xs text-slate-500">{formatTimestamp(selectedTicket.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedTicket.description}</p>
              </div>

              {selectedTicket.replies?.length ? (
                selectedTicket.replies.map((reply) => (
                  <div key={reply.id} className="rounded-[22px] border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {reply.authorUserId === myUserId ? "You" : `Support #${reply.authorUserId}`}
                      </p>
                      <span className="text-xs text-slate-500">{formatTimestamp(reply.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{reply.message}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  No support replies yet. Your first reply will also claim the case if it is still unassigned.
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Add Support Reply</label>
              <textarea
                rows={4}
                value={ticketReply}
                onChange={(event) => setTicketReply(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="Explain what you checked, what changed, and what the rider or driver should do next."
              />
            </div>

            <div className="mt-4 flex justify-end">
              <PrimaryActionButton
                className="min-h-[3.25rem] px-5"
                loading={replyMutation.isPending}
                disabled={!ticketReply.trim()}
                onClick={() => replyMutation.mutate({ ticketId: selectedTicket.id, message: ticketReply.trim() })}
              >
                Send Reply
              </PrimaryActionButton>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );

  const rideWorkspace = (
    <div className="space-y-5">
      <SectionCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Ride Investigation</h2>
            <p className="mt-1 text-sm text-slate-500">Pull any ride into view, inspect lifecycle and payment state, then intervene from the same surface.</p>
          </div>
          <StatusPill
            label={ride ? `Ride #${ride.id}` : "No ride loaded"}
            tone={ride ? "accent" : "muted"}
            hint={ride ? rideStatusLabel(ride.status) : null}
          />
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Input
              label="Ride ID"
              value={rideSearchId}
              onChange={(event) => setRideSearchId(event.target.value)}
              placeholder="Enter a ride number"
            />
          </div>
          <PrimaryActionButton
            className="min-h-[3.25rem] px-5"
            disabled={!canSearchRide}
            onClick={() => setActiveRideId(Number(normalizedRideSearchId))}
          >
            <FiSearch />
            Search Ride
          </PrimaryActionButton>
        </div>

        {!activeRideId ? (
          <EmptyState
            icon="🔎"
            title="No ride selected"
            description="Search for a ride or pick a ticket with a linked ride to load the investigation workspace."
            action={(
              <Button variant="secondary" className="rounded-2xl" onClick={() => setActiveView("queue")}>
                Open Support Queue
              </Button>
            )}
          />
        ) : rideQuery.isLoading ? (
          <div className="py-10">
            <LoadingSpinner />
          </div>
        ) : rideQuery.isError ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {rideQuery.error?.response?.data?.message || "Unable to load ride details right now."}
          </div>
        ) : ride ? (
          <>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">Live ride record</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950">{ride.pickupAddress}</h3>
                  <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
                </div>
                <Badge label={rideStatusLabel(ride.status)} variant={rideStatusVariant(ride.status)} size="sm" />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <DetailRow label="Customer" value={ride.customerName} />
                  <DetailRow label="Driver" value={ride.riderName || "Unassigned"} />
                  <DetailRow label="Payment" value={`${ride.paymentType} • ${ride.paymentStatus}`} emphasis />
                </div>
                <div className="space-y-3">
                  <DetailRow label="Fare" value={formatMoney(ride.finalFare || ride.estimatedFare)} emphasis />
                  <DetailRow label="Distance" value={formatDistance(ride.chargeableDistanceKm || ride.estimatedDistanceKm || 0)} />
                  <DetailRow label="Distance Source" value={ride.distanceSource || "Unknown"} />
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
              <SectionCard className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">Distance and Resolution</h3>
                    <p className="mt-1 text-sm text-slate-500">Correct KM, then resolve the dispute with clear notes that stay attached to the case.</p>
                  </div>
                  {ride.manualDistanceRequired ? (
                    <StatusPill label="Manual KM required" tone="warning" />
                  ) : null}
                </div>

                <Input
                  label="Override Distance (KM)"
                  type="number"
                  value={distanceOverrideKm}
                  onChange={(event) => setDistanceOverrideKm(event.target.value)}
                  placeholder="Enter corrected trip distance"
                />

                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  loading={fixKmsMutation.isPending}
                  disabled={parseOptionalNumber(distanceOverrideKm) === null}
                  onClick={() =>
                    fixKmsMutation.mutate({
                      rideId: ride.id,
                      kms: parseOptionalNumber(distanceOverrideKm)
                    })
                  }
                >
                  <FiMapPin />
                  Update Distance
                </Button>

                <div className="space-y-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <Input
                    label="Resolved Distance (optional)"
                    type="number"
                    value={resolvedDistanceKm}
                    onChange={(event) => setResolvedDistanceKm(event.target.value)}
                    placeholder="Use if support resolution should set the final billed KM"
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Ride Resolution Notes</label>
                    <textarea
                      rows={4}
                      value={rideResolutionNotes}
                      onChange={(event) => setRideResolutionNotes(event.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                      placeholder="Summarize what support reviewed and how the ride issue was closed."
                    />
                  </div>
                  <PrimaryActionButton
                    className="min-h-[3.25rem] px-5"
                    loading={resolveRideMutation.isPending}
                    onClick={() =>
                      resolveRideMutation.mutate({
                        rideId: ride.id,
                        payload: {
                          resolvedDistanceKm: typedResolvedDistance,
                          resolutionNotes: rideResolutionNotes.trim() || null
                        }
                      })
                    }
                  >
                    <FiCheckCircle />
                    Resolve Ride
                  </PrimaryActionButton>
                </div>
              </SectionCard>

              <SectionCard className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">Payment Intervention</h3>
                    <p className="mt-1 text-sm text-slate-500">Review the live payment record, trigger M-Pesa, approve cash, or force-settle when support needs to unblock the ride.</p>
                  </div>
                  <Badge label={ride.paymentType} variant={ride.paymentType === "MPESA" ? "teal" : "orange"} size="sm" />
                </div>

                {paymentQuery.isLoading ? (
                  <div className="py-8">
                    <LoadingSpinner />
                  </div>
                ) : paymentRecord ? (
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">Payment Record</p>
                      <Badge label={paymentRecord.status} variant={paymentVariant(paymentRecord.status)} size="sm" />
                    </div>
                    <div className="mt-4 space-y-3">
                      <DetailRow label="Amount" value={formatMoney(paymentRecord.amount)} emphasis />
                      <DetailRow label="Phone" value={paymentRecord.phoneNumber || "Not set"} />
                      <DetailRow label="Reference" value={paymentRecord.transactionRef || "Pending"} />
                      <DetailRow label="Provider" value={paymentRecord.providerResponseDescription || "Waiting for gateway response"} />
                    </div>
                  </div>
                ) : paymentMissing ? (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No payment record exists yet for this ride. You can still initiate the flow below.
                  </div>
                ) : paymentError ? (
                  <div className="rounded-[22px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                    {paymentError?.response?.data?.message || "Unable to load the payment record right now."}
                  </div>
                ) : null}

                {ride.paymentType === "MPESA" ? (
                  <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="space-y-3">
                      <DetailRow label="Registered phone" value={ride.customerPhone || "Not available"} />
                      {ride.manualDistanceRequired && paymentManualDistanceKm == null ? (
                        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          Enter or correct the final KM first. M-Pesa actions stay blocked until the ride has a usable chargeable distance.
                        </div>
                      ) : null}
                    </div>

                    <Input
                      label="STK Push Phone Number"
                      value={paymentPhoneNumber}
                      onChange={(event) => setPaymentPhoneNumber(event.target.value)}
                      placeholder="2547XXXXXXXX"
                    />

                    <div className="flex flex-wrap gap-3">
                      <PrimaryActionButton
                        className="min-h-[3.25rem] px-5"
                        loading={initiateMpesaMutation.isPending}
                        disabled={!paymentPhoneNumber.trim() || (ride.manualDistanceRequired && paymentManualDistanceKm == null) || paymentSettled}
                        onClick={() =>
                          initiateMpesaMutation.mutate({
                            rideId: ride.id,
                            phoneNumber: paymentPhoneNumber.trim(),
                            manualDistanceKm: paymentManualDistanceKm
                          })
                        }
                      >
                        <FiPhone />
                        Send STK Push
                      </PrimaryActionButton>

                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        loading={promptMpesaMutation.isPending}
                        disabled={(ride.manualDistanceRequired && paymentManualDistanceKm == null) || paymentSettled}
                        onClick={() => promptMpesaMutation.mutate(ride.id)}
                      >
                        <FiRefreshCw />
                        Prompt Registered Phone
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-[22px] border border-slate-200 bg-white p-4">
                    <div className="rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                      Use this when the rider has already collected cash and support needs to confirm settlement.
                    </div>
                    <PrimaryActionButton
                      className="min-h-[3.25rem] px-5"
                      loading={approveCashMutation.isPending}
                      disabled={(ride.manualDistanceRequired && paymentManualDistanceKm == null) || paymentSettled}
                      onClick={() =>
                        approveCashMutation.mutate({
                          rideId: ride.id,
                          payload: paymentManualDistanceKm != null ? { manualDistanceKm: paymentManualDistanceKm } : {}
                        })
                      }
                    >
                      <FiCreditCard />
                      Approve Cash Settlement
                    </PrimaryActionButton>
                  </div>
                )}

                {!paymentSettled ? (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    loading={forceApproveMutation.isPending}
                    onClick={() => forceApproveMutation.mutate(ride.id)}
                  >
                    <FiZap />
                    Force Approve Payment
                  </Button>
                ) : (
                  <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    Payment is already settled on this ride. If the gateway callback succeeded, the trip may already be closing automatically.
                  </div>
                )}
              </SectionCard>
            </div>
          </>
        ) : (
          <EmptyState
            icon="⚠"
            title="Ride not found"
            description="Check the ride ID and try again."
          />
        )}
      </SectionCard>
    </div>
  );

  return (
    <div className="space-y-5 pb-8">
      <AppHeader
        eyebrow="Support Desk"
        title={currentView.label}
        subtitle={currentView.value === "home"
          ? "Start with summaries, then step into queue, case work, ride investigation, or messaging only when you need it."
          : currentView.description}
        status={<StatusPill label={`${stats.queue} active cases`} tone={stats.queue ? "warning" : "success"} hint={`${stats.myCases} assigned to you`} />}
        trailing={<StatusPill label={`${unreadSummaryQuery.data?.totalUnread || 0} chat unread`} tone={(unreadSummaryQuery.data?.totalUnread || 0) > 0 ? "accent" : "muted"} />}
      />

      <NoticeBanner notice={notice} />

      <div className="grid gap-5 xl:grid-cols-[18rem,minmax(0,1fr)]">
        <SupportWorkspaceNav
          activeView={activeView}
          onChange={setActiveView}
          stats={stats}
          selectedTicket={selectedTicket}
          activeRideId={activeRideId}
          unreadSummary={unreadSummaryQuery.data}
        />

        <div className="min-w-0">
          {activeView === "home" ? homeView : null}
          {activeView === "queue" ? queueView : null}
          {activeView === "case" ? ticketWorkspace : null}
          {activeView === "ride" ? rideWorkspace : null}
          {activeView === "messaging" ? messagingView : null}
        </div>
      </div>
    </div>
  );
}
