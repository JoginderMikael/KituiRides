/**
 * @fileoverview Page component for support workspace.
 */
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiArchive,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCheck,
  FiCheckCircle,
  FiChevronDown,
  FiCreditCard,
  FiGrid,
  FiInbox,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiMessageCircle,
  FiMoreVertical,
  FiPaperclip,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiSettings,
  FiShield,
  FiSmile,
  FiUser,
  FiUsers,
  FiX,
  FiZap
} from "react-icons/fi";
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
const TICKET_PAGE_SIZE = 6;

const selectClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

const panelClass =
  "rounded-2xl border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)]";

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function formatDistance(value) {
  return `${Number(value || 0).toFixed(2)} km`;
}

function formatTimestamp(value) {
  if (!value) return "Waiting for update";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatShortDate(value) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatRelativeTime(value) {
  if (!value) return "New";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function labelForTicketStatus(status) {
  return {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved"
  }[status] || status;
}

function labelForTicketType(ticketType) {
  return {
    GENERAL: "General",
    DISPUTE: "Dispute",
    PAYMENT_CONFLICT: "Payment Conflict",
    DRIVER_EDIT_REQUEST: "Driver Edit Request"
  }[ticketType] || ticketType;
}

function ticketStatusVariant(status) {
  if (status === "RESOLVED") return "success";
  if (status === "IN_PROGRESS") return "warning";
  return "error";
}

function ticketTypeVariant(ticketType) {
  if (ticketType === "DISPUTE") return "error";
  if (ticketType === "PAYMENT_CONFLICT") return "warning";
  if (ticketType === "DRIVER_EDIT_REQUEST") return "info";
  return "default";
}

function paymentVariant(status) {
  if (status === "SUCCESS") return "success";
  if (status === "FAILED") return "error";
  return "warning";
}

function toMpesaPhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";
  if (phoneNumber.startsWith("254")) return phoneNumber;
  if (phoneNumber.startsWith("+254")) return phoneNumber.slice(1);
  if (phoneNumber.startsWith("0")) return `254${phoneNumber.slice(1)}`;
  return phoneNumber;
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function matchesTicket(ticket, searchTerm) {
  if (!searchTerm) return true;
  const haystack = [
    ticket.id,
    ticket.subject,
    ticket.description,
    ticket.ticketType,
    ticket.status,
    ticket.rideId,
    ticket.createdByUserId,
    ticket.assignedToUserId
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
}

function customerLabel(ticket, ride) {
  if (ride && ticket?.rideId === ride.id && ride.customerName) return ride.customerName;
  return `Customer #${ticket?.createdByUserId || "Unknown"}`;
}

function avatarInitials(label) {
  return String(label || "KR")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DetailRow({ label, value, children }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{children || value}</span>
    </div>
  );
}

function NoticeBanner({ notice }) {
  if (!notice) return null;

  const classes = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    info: "border-sky-200 bg-sky-50 text-sky-900"
  };

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${classes[notice.tone] || classes.info}`}>
      {notice.message}
    </div>
  );
}

function SupportLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-14 w-11 items-start justify-center rounded-t-full rounded-bl-full bg-emerald-600 pt-3 text-white shadow-lg shadow-emerald-100">
        <FiCreditCard className="text-xl" />
      </div>
      <div>
        <p className="text-3xl font-bold leading-none tracking-tight text-slate-950">
          Kitui<span className="font-medium text-emerald-600">Rides</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">Support Center</p>
      </div>
    </div>
  );
}

function SidebarButton({ icon: Icon, label, active, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[3rem] w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-medium transition ${
        active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="text-xl" />
      <span className="flex-1">{label}</span>
      {badge ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{badge}</span> : null}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-orange-500",
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600"
  };

  return (
    <div className={`${panelClass} flex items-center gap-5 px-6 py-5`}>
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon className="text-2xl" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-emerald-600">up</span> from current queue
        </p>
      </div>
    </div>
  );
}

function TicketStatusPill({ status }) {
  const classes = {
    OPEN: "bg-rose-50 text-rose-600",
    IN_PROGRESS: "bg-amber-50 text-orange-600",
    RESOLVED: "bg-emerald-50 text-emerald-600"
  };

  return (
    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${classes[status] || classes.OPEN}`}>
      {labelForTicketStatus(status)}
    </span>
  );
}

function TicketListItem({ ticket, active, ownedByCurrentAgent, customerName, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-4 text-left last:border-b-0 ${
        active ? "rounded-xl border-b-transparent bg-emerald-50 shadow-[inset_3px_0_0_#22c55e]" : "hover:bg-slate-50"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold ${
        active ? "bg-violet-100 text-violet-700" : "bg-emerald-50 text-emerald-700"
      }`}>
        {avatarInitials(customerName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-950">#TKR-{ticket.id}</p>
          {ownedByCurrentAgent ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
        </div>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{ticket.subject}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{customerName}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="text-xs text-slate-500">{formatRelativeTime(ticket.createdAt)}</span>
        <TicketStatusPill status={ticket.status} />
      </div>
    </button>
  );
}

function MessageBubble({ align = "left", children, time, muted }) {
  const right = align === "right";

  return (
    <div className={`flex ${right ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-xl border px-4 py-3 text-sm leading-6 ${
          right
            ? "border-emerald-100 bg-emerald-50 text-slate-800"
            : muted
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : "border-slate-200 bg-white text-slate-800"
        }`}
      >
        <p>{children}</p>
        <p className={`mt-2 text-xs ${right ? "text-emerald-700" : "text-slate-500"}`}>
          {time}
          {right ? <FiCheck className="ml-2 inline text-emerald-600" /> : null}
        </p>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { session, user, logout } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [queueSearch, setQueueSearch] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [rideSearchId, setRideSearchId] = useState("");
  const [activeRideId, setActiveRideId] = useState(null);
  const [ticketReply, setTicketReply] = useState("");
  const [ticketStatus, setTicketStatus] = useState("OPEN");
  const [ticketResolutionNotes, setTicketResolutionNotes] = useState("");
  const [visibleTicketCount, setVisibleTicketCount] = useState(TICKET_PAGE_SIZE);
  const [distanceOverrideKm, setDistanceOverrideKm] = useState("");
  const [resolvedDistanceKm, setResolvedDistanceKm] = useState("");
  const [rideResolutionNotes, setRideResolutionNotes] = useState("");
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState("");
  const [notice, setNotice] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
  const myUserId = session?.userId;

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "OPEN").length,
    inProgress: tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length,
    resolved: tickets.filter((ticket) => ticket.status === "RESOLVED").length,
    queue: tickets.filter((ticket) => ticket.status !== "RESOLVED").length,
    myCases: tickets.filter((ticket) => ticket.assignedToUserId === myUserId && ticket.status !== "RESOLVED").length,
    unassigned: tickets.filter((ticket) => !ticket.assignedToUserId).length,
    disputes: tickets.filter((ticket) => ticket.ticketType === "DISPUTE").length,
    paymentConflicts: tickets.filter((ticket) => ticket.ticketType === "PAYMENT_CONFLICT").length,
    escalations: unreadSummaryQuery.data?.supportAdminUnread || 0
  }), [myUserId, tickets, unreadSummaryQuery.data?.supportAdminUnread]);

  const filteredTickets = useMemo(() => (
    tickets.filter((ticket) => {
      const matchesFilter = queueFilter === "ALL" ? true : ticket.status === queueFilter;
      return matchesFilter && matchesTicket(ticket, deferredQueueSearch.trim());
    })
  ), [deferredQueueSearch, queueFilter, tickets]);

  const visibleTickets = filteredTickets.slice(0, visibleTicketCount);
  const remainingTicketCount = Math.max(0, filteredTickets.length - visibleTickets.length);
  const hasMoreTickets = remainingTicketCount > 0;

  useEffect(() => {
    setVisibleTicketCount(TICKET_PAGE_SIZE);
  }, [deferredQueueSearch, queueFilter]);

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
    if (!selectedTicket) return;
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
    if (ride?.customerPhone) {
      setPaymentPhoneNumber(toMpesaPhoneNumber(ride.customerPhone));
    }
  }, [ride?.id, ride?.customerPhone]);

  useEffect(() => {
    if (!mobileSidebarOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  const activeAgentName = user ? `${user.firstName} ${user.lastName}` : "Support Agent";
  const activeCustomer = selectedTicket ? customerLabel(selectedTicket, ride) : "Customer";
  const normalizedRideSearchId = rideSearchId.trim();
  const canSearchRide = normalizedRideSearchId && !Number.isNaN(Number(normalizedRideSearchId));
  const typedResolvedDistance = parseOptionalNumber(resolvedDistanceKm);
  const rideChargeableDistance = parseOptionalNumber(ride?.chargeableDistanceKm);
  const typedDistanceOverride = parseOptionalNumber(distanceOverrideKm);
  const paymentManualDistanceKm = ride?.manualDistanceRequired
    ? rideChargeableDistance ?? typedDistanceOverride ?? typedResolvedDistance
    : undefined;
  const paymentSettled = Boolean(ride?.paymentApproved) || ride?.paymentStatus === "SUCCESS";
  const paymentRecord = paymentQuery.data || null;
  const paymentMissing = paymentQuery.error?.response?.status === 404;
  const paymentError = paymentQuery.error && !paymentMissing ? paymentQuery.error : null;

  function openTicketWorkspace(ticket, nextView = "dashboard") {
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

  function openSupportView(view) {
    setActiveView(view);
    setMobileSidebarOpen(false);
  }

  function openProfile() {
    setMobileSidebarOpen(false);
    navigate("/profile");
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
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to send the reply right now.")
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ ticketId, payload }) => updateTicket(ticketId, payload),
    onSuccess: async () => {
      setWorkspaceMessage("success", "Ticket updated. Ownership and queue state have been refreshed.");
      await refreshWorkspace(selectedTicket?.rideId || activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to update this ticket right now.")
  });

  const fixKmsMutation = useMutation({
    mutationFn: ({ rideId, kms }) => fixRideKms(rideId, kms),
    onSuccess: async () => {
      setWorkspaceMessage("success", "Ride distance updated. Payment and dispute calculations now use the corrected KM.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to update ride distance right now.")
  });

  const resolveRideMutation = useMutation({
    mutationFn: ({ rideId, payload }) => resolveRide(rideId, payload),
    onSuccess: async () => {
      setRideResolutionNotes("");
      setResolvedDistanceKm("");
      setWorkspaceMessage("success", "Ride resolved and the support queue has been refreshed.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to resolve this ride right now.")
  });

  const forceApproveMutation = useMutation({
    mutationFn: forceApprovePayment,
    onSuccess: async () => {
      setWorkspaceMessage("success", "Payment force-approved. The ride record now reflects support intervention.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to force-approve this payment right now.")
  });

  const initiateMpesaMutation = useMutation({
    mutationFn: (payload) => initiateMpesaPayment(payload),
    onSuccess: async () => {
      setWorkspaceMessage("success", "STK push sent. Ask the customer to complete the request on their phone.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to initiate M-Pesa STK push right now.")
  });

  const promptMpesaMutation = useMutation({
    mutationFn: promptCustomerMpesaPayment,
    onSuccess: async () => {
      setWorkspaceMessage("success", "Registered-number M-Pesa prompt sent to the customer.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to prompt the customer for M-Pesa payment right now.")
  });

  const approveCashMutation = useMutation({
    mutationFn: ({ rideId, payload }) => approveCashPayment(rideId, payload),
    onSuccess: async () => {
      setWorkspaceMessage("success", "Cash payment approved. The ride state has been refreshed.");
      await refreshWorkspace(activeRideId);
    },
    onError: (error) => setWorkspaceMessage("error", error?.response?.data?.message || "Unable to approve the cash settlement right now.")
  });

  function handleLogout() {
    setMobileSidebarOpen(false);
    logout();
    navigate("/login");
  }

  const renderSupportNav = (className = "") => (
    <aside className={`overflow-y-auto overscroll-contain border-r border-slate-200 bg-white px-4 py-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>
      <SupportLogo />

      <nav aria-label="Support workspace navigation" className="mt-8 space-y-2">
        <SidebarButton icon={FiGrid} label="Dashboard" active={activeView === "dashboard"} onClick={() => openSupportView("dashboard")} />
        <SidebarButton icon={FiInbox} label="Support Queue" active={activeView === "queue"} badge={stats.queue} onClick={() => openSupportView("queue")} />
        <SidebarButton icon={FiShield} label="Case Workspace" active={activeView === "case"} badge={selectedTicket ? `#${selectedTicket.id}` : null} onClick={() => openSupportView("case")} />
        <SidebarButton icon={FiMapPin} label="Ride Investigation" active={activeView === "ride"} badge={activeRideId ? `#${activeRideId}` : null} onClick={() => openSupportView("ride")} />
        <SidebarButton icon={FiMessageCircle} label="Messaging" active={activeView === "messaging"} badge={unreadSummaryQuery.data?.totalUnread || 0} onClick={() => openSupportView("messaging")} />
      </nav>

      <div className="mt-8 space-y-2 border-t border-slate-100 pt-6">
        <SidebarButton icon={FiUsers} label="Contacts" onClick={() => openSupportView("messaging")} />
        <SidebarButton icon={FiBookOpen} label="Knowledge Base" onClick={() => openSupportView("case")} />
        <SidebarButton icon={FiBarChart2} label="Reports" onClick={() => openSupportView("queue")} />
        <SidebarButton icon={FiSettings} label="Settings" onClick={() => openSupportView("case")} />
        <SidebarButton icon={FiUser} label="Profile" onClick={openProfile} />
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-sm font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100"
      >
        <FiLogOut aria-hidden="true" />
        <span>Logout</span>
      </button>
    </aside>
  );

  const ticketListPanel = (
    <section className={`${panelClass} min-h-[38rem] overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">All Tickets</h2>
          <p className="sr-only">Priority Queue Snapshot</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
          <FiMenu />
          Filter
          <FiChevronDown />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-3">
        {QUEUE_FILTERS.map((filter) => {
          const count = filter === "ALL" ? stats.total : tickets.filter((ticket) => ticket.status === filter).length;
          const active = queueFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setQueueFilter(filter)}
              className={`whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-medium transition ${
                active ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {filter === "ALL" ? "All" : labelForTicketStatus(filter)}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{count}</span>
            </button>
          );
        })}
      </div>

      {ticketsQuery.isLoading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : ticketsQuery.isError ? (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {ticketsQuery.error?.response?.data?.message || "Unable to load the support queue right now."}
        </div>
      ) : !filteredTickets.length ? (
        <div className="px-4 py-10">
          <EmptyState icon="[]" title="Queue is clear" description="No tickets match the current search and status filters." />
        </div>
      ) : (
        <div className="p-3">
          {visibleTickets.map((ticket) => (
            <TicketListItem
              key={ticket.id}
              ticket={ticket}
              active={ticket.id === activeTicketId}
              ownedByCurrentAgent={ticket.assignedToUserId === myUserId}
              customerName={customerLabel(ticket, ride)}
              onSelect={() => openTicketWorkspace(ticket, "dashboard")}
            />
          ))}
          {hasMoreTickets ? (
            <button
              type="button"
              onClick={() => setVisibleTicketCount((count) => count + TICKET_PAGE_SIZE)}
              className="mt-3 inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              Load more tickets
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {remainingTicketCount}
              </span>
            </button>
          ) : null}
        </div>
      )}
    </section>
  );

  const conversationPanel = (
    <section className={`${panelClass} flex min-h-[38rem] flex-col overflow-hidden`}>
      <h2 className="sr-only">Reply Thread</h2>
      {!selectedTicket ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon="[]"
            title="Select a ticket"
            description="Choose a queue item to load the case summary, reply thread, and ride-linked tools."
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">Ticket #TKR-{selectedTicket.id}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedTicket.subject}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={ticketStatus}
                onChange={(event) => setTicketStatus(event.target.value)}
                className="rounded-lg border-0 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 outline-none"
              >
                {TICKET_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{labelForTicketStatus(option)}</option>
                ))}
              </select>
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50" aria-label="Ticket menu">
                <FiMoreVertical />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                  {avatarInitials(activeCustomer)}
                </div>
                <div>
                  <p className="font-semibold text-slate-950">{activeCustomer}</p>
                  <p className="text-xs text-slate-500">
                    Ticket creator #{selectedTicket.createdByUserId}
                    {ride?.customerPhone ? ` | ${ride.customerPhone}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>{formatShortDate(selectedTicket.createdAt)}</p>
                <p>{formatTimestamp(selectedTicket.createdAt).split(",").pop()}</p>
              </div>
            </div>

            <MessageBubble time={formatTimestamp(selectedTicket.createdAt)}>
              {selectedTicket.description}
            </MessageBubble>

            {selectedTicket.replies?.length ? selectedTicket.replies.map((reply) => (
              <MessageBubble
                key={reply.id}
                align={reply.authorUserId === myUserId ? "right" : "left"}
                time={formatTimestamp(reply.createdAt)}
              >
                {reply.message}
              </MessageBubble>
            )) : (
              <MessageBubble muted time="No replies yet">
                No support replies yet. Your first reply will also claim the case if it is still unassigned.
              </MessageBubble>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="mb-3 flex gap-5 border-b border-slate-100">
              <button className="border-b-2 border-emerald-500 pb-2 text-sm font-semibold text-emerald-600" type="button">Reply</button>
              <button className="pb-2 text-sm font-medium text-slate-500" type="button">Internal Note</button>
            </div>
            <label className="sr-only" htmlFor="ticket-reply">Add Support Reply</label>
            <textarea
              id="ticket-reply"
              rows={4}
              value={ticketReply}
              onChange={(event) => setTicketReply(event.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Type your message..."
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-3 text-slate-500">
                <FiPaperclip />
                <FiSmile />
              </div>
              <Button
                className="rounded-xl bg-emerald-600 px-4 hover:bg-emerald-700"
                loading={replyMutation.isPending}
                disabled={!ticketReply.trim()}
                onClick={() => replyMutation.mutate({ ticketId: selectedTicket.id, message: ticketReply.trim() })}
              >
                Send Reply
                <FiSend />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );

  const rightRail = (
    <aside className="space-y-4">
      <section className={`${panelClass} p-5`}>
        <h2 className="text-lg font-semibold text-slate-950">Ticket Details</h2>
        {selectedTicket ? (
          <div className="mt-5 space-y-4">
            <DetailRow label="Status"><TicketStatusPill status={selectedTicket.status} /></DetailRow>
            <DetailRow label="Priority">
              <span className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
                {selectedTicket.ticketType === "DISPUTE" ? "High" : selectedTicket.ticketType === "PAYMENT_CONFLICT" ? "Medium" : "Normal"}
              </span>
            </DetailRow>
            <DetailRow label="Category" value={labelForTicketType(selectedTicket.ticketType)} />
            <DetailRow label="Subcategory" value={selectedTicket.rideId ? `Ride #${selectedTicket.rideId}` : "General Support"} />
            <DetailRow label="Created At" value={formatTimestamp(selectedTicket.createdAt)} />
            <DetailRow label="Last Updated" value={selectedTicket.replies?.length ? formatTimestamp(selectedTicket.replies[selectedTicket.replies.length - 1].createdAt) : "No replies yet"} />
            <DetailRow label="Channel" value="Mobile App" />
            <DetailRow label="Assigned To" value={selectedTicket.assignedToUserId === myUserId ? "You" : selectedTicket.assignedToUserId ? `Agent #${selectedTicket.assignedToUserId}` : "Unassigned"} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Select a ticket to inspect queue details.</p>
        )}
      </section>

      <section className={`${panelClass} p-5`}>
        <h2 className="text-lg font-semibold text-slate-950">Customer Details</h2>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-700">
            {avatarInitials(activeCustomer)}
          </div>
          <div>
            <p className="font-semibold text-slate-950">{activeCustomer}</p>
            <p className="text-sm text-slate-500">{ride?.customerPhone || `User #${selectedTicket?.createdByUserId || "-"}`}</p>
          </div>
        </div>
        {selectedTicket?.rideId ? (
          <button type="button" onClick={() => openRideWorkspace(selectedTicket.rideId)} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
            View Full Profile
            <FiCheck />
          </button>
        ) : null}
      </section>

      <section className={`${panelClass} p-5`}>
        <h2 className="text-lg font-semibold text-slate-950">Quick Actions</h2>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            disabled={!selectedTicket}
            onClick={() => selectedTicket && updateTicketMutation.mutate({ ticketId: selectedTicket.id, payload: { status: "IN_PROGRESS", resolutionNotes: ticketResolutionNotes.trim() || null } })}
            className="flex min-h-[2.8rem] w-full items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiAlertCircle className="text-orange-500" />
            Mark as In Progress
          </button>
          <button
            type="button"
            disabled={!selectedTicket}
            onClick={() => selectedTicket && updateTicketMutation.mutate({ ticketId: selectedTicket.id, payload: { status: "RESOLVED", resolutionNotes: ticketResolutionNotes.trim() || null } })}
            className="flex min-h-[2.8rem] w-full items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiCheckCircle className="text-emerald-600" />
            Mark as Resolved
          </button>
          <button
            type="button"
            disabled={!selectedTicket}
            onClick={() => selectedTicket && updateTicketMutation.mutate({ ticketId: selectedTicket.id, payload: { status: "RESOLVED", resolutionNotes: ticketResolutionNotes.trim() || "Closed by support agent." } })}
            className="flex min-h-[2.8rem] w-full items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FiArchive className="text-rose-500" />
            Close Ticket
          </button>
        </div>
      </section>
    </aside>
  );

  const ownershipPanel = selectedTicket ? (
    <section className={`${panelClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Ownership and Status</h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedTicket.assignedToUserId === myUserId
              ? "This case already belongs to you."
              : "Replying or updating this ticket will claim it to your queue automatically."}
          </p>
        </div>
        <Badge label={activeAgentName} variant="teal" size="sm" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ticket Status</label>
          <select value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value)} className={selectClassName}>
            {TICKET_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{labelForTicketStatus(option)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Resolution Notes</label>
          <textarea
            rows={4}
            value={ticketResolutionNotes}
            onChange={(event) => setTicketResolutionNotes(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            placeholder="Capture what changed, what is pending, or how this case was resolved."
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
          loading={updateTicketMutation.isPending}
          onClick={() => updateTicketMutation.mutate({
            ticketId: selectedTicket.id,
            payload: { status: ticketStatus, resolutionNotes: ticketResolutionNotes.trim() || null }
          })}
        >
          Save Queue Update
        </Button>
        {selectedTicket.rideId ? (
          <Button variant="secondary" className="rounded-xl" onClick={() => openRideWorkspace(selectedTicket.rideId)}>
            Open Linked Ride
          </Button>
        ) : null}
      </div>
    </section>
  ) : null;

  const messagingPanel = (
    <section className={`${panelClass} p-5`}>
      <h2 className="text-lg font-semibold text-slate-950">Messaging Workflow</h2>
      <p className="mt-1 text-sm text-slate-500">Support and admin conversation lanes stay available through the floating chat launchers.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Customer unread</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{unreadSummaryQuery.data?.supportCustomerUnread || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Driver unread</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{unreadSummaryQuery.data?.supportDriverUnread || 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Admin unread</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{unreadSummaryQuery.data?.supportAdminUnread || 0}</p>
        </div>
      </div>
    </section>
  );

  const rideWorkspace = (
    <section className={`${panelClass} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Ride Investigation</h2>
          <p className="mt-1 text-sm text-slate-500">Inspect a ride, fix KM, resolve disputes, and recover payment from one focused panel.</p>
        </div>
        <Badge label={ride ? `Ride #${ride.id}` : "No ride loaded"} variant={ride ? "teal" : "default"} size="sm" />
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <Input label="Ride ID" value={rideSearchId} onChange={(event) => setRideSearchId(event.target.value)} placeholder="Enter a ride number" />
        </div>
        <Button
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
          disabled={!canSearchRide}
          onClick={() => setActiveRideId(Number(normalizedRideSearchId))}
        >
          <FiSearch />
          Search Ride
        </Button>
      </div>

      {!activeRideId ? (
        <div className="mt-6">
          <EmptyState icon="[]" title="No ride selected" description="Search for a ride or pick a ticket with a linked ride to load the investigation workspace." />
        </div>
      ) : rideQuery.isLoading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : rideQuery.isError ? (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {rideQuery.error?.response?.data?.message || "Unable to load ride details right now."}
        </div>
      ) : ride ? (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Live ride record</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">{ride.pickupAddress}</h3>
                <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
              </div>
              <Badge label={rideStatusLabel(ride.status)} variant={rideStatusVariant(ride.status)} size="sm" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <DetailRow label="Customer" value={ride.customerName} />
              <DetailRow label="Driver" value={ride.riderName || "Unassigned"} />
              <DetailRow label="Payment" value={`${ride.paymentType} | ${ride.paymentStatus}`} />
              <DetailRow label="Fare" value={formatMoney(ride.finalFare || ride.estimatedFare)} />
              <DetailRow label="Distance" value={formatDistance(ride.chargeableDistanceKm || ride.estimatedDistanceKm || 0)} />
              <DetailRow label="Distance Source" value={ride.distanceSource || "Unknown"} />
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-950">Distance and Resolution</h3>
              <Input label="Override Distance (KM)" type="number" value={distanceOverrideKm} onChange={(event) => setDistanceOverrideKm(event.target.value)} placeholder="Enter corrected trip distance" />
              <Button
                variant="secondary"
                className="rounded-xl"
                loading={fixKmsMutation.isPending}
                disabled={parseOptionalNumber(distanceOverrideKm) === null}
                onClick={() => fixKmsMutation.mutate({ rideId: ride.id, kms: parseOptionalNumber(distanceOverrideKm) })}
              >
                <FiMapPin />
                Update Distance
              </Button>
              <Input label="Resolved Distance (optional)" type="number" value={resolvedDistanceKm} onChange={(event) => setResolvedDistanceKm(event.target.value)} placeholder="Use if support resolution should set the final billed KM" />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ride Resolution Notes</label>
                <textarea
                  rows={4}
                  value={rideResolutionNotes}
                  onChange={(event) => setRideResolutionNotes(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Summarize what support reviewed and how the ride issue was closed."
                />
              </div>
              <Button
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                loading={resolveRideMutation.isPending}
                onClick={() => resolveRideMutation.mutate({
                  rideId: ride.id,
                  payload: { resolvedDistanceKm: typedResolvedDistance, resolutionNotes: rideResolutionNotes.trim() || null }
                })}
              >
                <FiCheckCircle />
                Resolve Ride
              </Button>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950">Payment Intervention</h3>
                <Badge label={ride.paymentType} variant={ride.paymentType === "MPESA" ? "teal" : "orange"} size="sm" />
              </div>

              {paymentQuery.isLoading ? (
                <div className="py-8"><LoadingSpinner /></div>
              ) : paymentRecord ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Payment Record</p>
                    <Badge label={paymentRecord.status} variant={paymentVariant(paymentRecord.status)} size="sm" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <DetailRow label="Amount" value={formatMoney(paymentRecord.amount)} />
                    <DetailRow label="Phone" value={paymentRecord.phoneNumber || "Not set"} />
                    <DetailRow label="Reference" value={paymentRecord.transactionRef || "Pending"} />
                    <DetailRow label="Provider" value={paymentRecord.providerResponseDescription || "Waiting for gateway response"} />
                  </div>
                </div>
              ) : paymentMissing ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No payment record exists yet for this ride. You can still initiate the flow below.
                </div>
              ) : paymentError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  {paymentError?.response?.data?.message || "Unable to load the payment record right now."}
                </div>
              ) : null}

              {ride.paymentType === "MPESA" ? (
                <div className="space-y-4">
                  <DetailRow label="Registered phone" value={ride.customerPhone || "Not available"} />
                  {ride.manualDistanceRequired && paymentManualDistanceKm == null ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Enter or correct the final KM first. M-Pesa actions stay blocked until the ride has a usable chargeable distance.
                    </div>
                  ) : null}
                  <Input label="STK Push Phone Number" value={paymentPhoneNumber} onChange={(event) => setPaymentPhoneNumber(event.target.value)} placeholder="2547XXXXXXXX" />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                      loading={initiateMpesaMutation.isPending}
                      disabled={!paymentPhoneNumber.trim() || (ride.manualDistanceRequired && paymentManualDistanceKm == null) || paymentSettled}
                      onClick={() => initiateMpesaMutation.mutate({ rideId: ride.id, phoneNumber: paymentPhoneNumber.trim(), manualDistanceKm: paymentManualDistanceKm })}
                    >
                      <FiPhone />
                      Send STK Push
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-xl"
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
                <Button
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  loading={approveCashMutation.isPending}
                  disabled={(ride.manualDistanceRequired && paymentManualDistanceKm == null) || paymentSettled}
                  onClick={() => approveCashMutation.mutate({
                    rideId: ride.id,
                    payload: paymentManualDistanceKm != null ? { manualDistanceKm: paymentManualDistanceKm } : {}
                  })}
                >
                  <FiCreditCard />
                  Approve Cash Settlement
                </Button>
              )}

              {!paymentSettled ? (
                <Button variant="outline" className="rounded-xl" loading={forceApproveMutation.isPending} onClick={() => forceApproveMutation.mutate(ride.id)}>
                  <FiZap />
                  Force Approve Payment
                </Button>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Payment is already settled on this ride.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState icon="!" title="Ride not found" description="Check the ride ID and try again." />
        </div>
      )}
    </section>
  );

  const dashboardView = (
    <>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={FiArchive} label="Total Tickets" value={stats.total} tone="emerald" />
        <StatCard icon={FiMessageCircle} label="Open Tickets" value={stats.open} tone="amber" />
        <StatCard icon={FiInbox} label="In Progress" value={stats.inProgress} tone="violet" />
        <StatCard icon={FiCheck} label="Resolved" value={stats.resolved} tone="blue" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(18rem,0.95fr),minmax(24rem,1.1fr),minmax(18rem,0.78fr)]">
        {ticketListPanel}
        {conversationPanel}
        {rightRail}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr,1fr]">
        {ownershipPanel}
        {messagingPanel}
      </div>

      <div className="mt-5">
        {rideWorkspace}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 lg:flex">
      {renderSupportNav("hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[17rem]")}

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close support navigation"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative h-full w-[min(20rem,86vw)] overflow-hidden bg-white shadow-2xl">
            <button
              type="button"
              aria-label="Close support navigation"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100"
            >
              <FiX aria-hidden="true" />
            </button>
            {renderSupportNav("h-full w-full border-r-0")}
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="Open support navigation"
              onClick={() => setMobileSidebarOpen(true)}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-100 lg:hidden"
            >
              <FiMenu className="text-xl" aria-hidden="true" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Support Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">Manage customer inquiries and provide excellent support</p>
              <p className="sr-only">Operational Shortcuts</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[28rem]">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={queueSearch}
                onChange={(event) => setQueueSearch(event.target.value)}
                placeholder="Search tickets by ID, name, or subject..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
              <FiBell className="text-xl" />
              <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">{unreadSummaryQuery.data?.totalUnread || 0}</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-white">
                <FiUser />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">{activeAgentName}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online</p>
              </div>
            </div>
          </div>
        </div>

        <NoticeBanner notice={notice} />

        {activeView === "dashboard" ? dashboardView : null}
        {activeView === "queue" ? <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.9fr),minmax(24rem,1fr)]">{ticketListPanel}{conversationPanel}</div> : null}
        {activeView === "case" ? <div className="space-y-4">{conversationPanel}{ownershipPanel}{rightRail}</div> : null}
        {activeView === "ride" ? rideWorkspace : null}
        {activeView === "messaging" ? messagingPanel : null}
      </main>
    </div>
  );
}
