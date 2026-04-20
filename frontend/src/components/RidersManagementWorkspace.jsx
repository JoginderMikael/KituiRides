import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFlag,
  FiFilter,
  FiGrid,
  FiLifeBuoy,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiXCircle
} from "react-icons/fi";
import { Avatar, EmptyState, Input, Modal } from "./UIComponents";

const ACTIVE_REQUEST_STATUSES = new Set([
  "REQUESTED",
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "PAYMENT_PENDING",
  "DISPUTED"
]);

const STATUS_OPTIONS = [
  { value: "ALL", label: "Account status" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" }
];

const REVIEW_OPTIONS = [
  { value: "ALL", label: "Review state" },
  { value: "TRUSTED", label: "Trusted" },
  { value: "ESTABLISHED", label: "Established" },
  { value: "FLAGGED", label: "Needs review" },
  { value: "NEW", label: "New account" }
];

const ACTIVITY_OPTIONS = [
  { value: "ALL", label: "Activity level" },
  { value: "LIVE", label: "Live request" },
  { value: "RECENT", label: "Recent rider" },
  { value: "OCCASIONAL", label: "Occasional" },
  { value: "DORMANT", label: "Dormant" }
];

const DATE_OPTIONS = [
  { value: "ALL", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" }
];

const SORT_OPTIONS = [
  { value: "ISSUE_PRIORITY", label: "Issue priority" },
  { value: "LATEST", label: "Newest accounts" },
  { value: "LAST_ACTIVITY", label: "Latest activity" },
  { value: "MOST_RIDES", label: "Most rides" },
  { value: "OLDEST", label: "Oldest accounts" }
];

const PAGE_SIZE = 8;

function formatMoney(value) {
  return `KES ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatRelativeTime(value) {
  if (!value) {
    return "No recent activity";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No recent activity";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return formatDate(value);
}

function getRideTimestamp(ride) {
  return [
    ride.completedAt,
    ride.paymentCompletedAt,
    ride.disputedAt,
    ride.paymentPendingAt,
    ride.startedAt,
    ride.arrivedAt,
    ride.acceptedAt,
    ride.requestedAt
  ]
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .find((value) => !Number.isNaN(value)) || 0;
}

function getToneStyles(tone) {
  return {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700"
  }[tone] || "border-slate-200 bg-slate-100 text-slate-600";
}

function formatRiderCode(id) {
  return `KRC-${String(id || 0).padStart(4, "0")}`;
}

function toTimeValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isNaN(value) ? 0 : value;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function hasRecentActivity(value, days) {
  const timestamp = toTimeValue(value);
  if (!timestamp) {
    return false;
  }

  return Date.now() - timestamp <= days * 24 * 60 * 60 * 1000;
}

function buildRiderRecord(rider, rides, tickets) {
  const riderRides = rides
    .filter((ride) => ride.customerId === rider.id)
    .sort((left, right) => getRideTimestamp(right) - getRideTimestamp(left));
  const riderTickets = tickets
    .filter((ticket) => ticket.createdByUserId === rider.id)
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  const completedRides = riderRides.filter((ride) => ride.status === "TRIP_COMPLETED" || ride.status === "PAYMENT_COMPLETED");
  const disputedRides = riderRides.filter((ride) => ride.status === "DISPUTED");
  const activeRequests = riderRides.filter((ride) => ACTIVE_REQUEST_STATUSES.has(ride.status));
  const openTickets = riderTickets.filter((ticket) => ticket.status !== "RESOLVED");
  const joinedTimestamp = rider.createdAt ? new Date(rider.createdAt).getTime() : 0;
  const latestRideTimestamp = riderRides[0] ? getRideTimestamp(riderRides[0]) : 0;
  const latestTicketTimestamp = riderTickets[0]?.createdAt ? new Date(riderTickets[0].createdAt).getTime() : 0;
  const lastActivityTimestamp = Math.max(joinedTimestamp, latestRideTimestamp, latestTicketTimestamp);

  const accountState = rider.active === false
    ? { key: "SUSPENDED", label: "Suspended", tone: "rose" }
    : { key: "ACTIVE", label: "Active", tone: "emerald" };

  let reviewState = { key: "NEW", label: "New account", tone: "sky" };
  if (rider.active === false) {
    reviewState = { key: "FLAGGED", label: "Restricted", tone: "rose" };
  } else if (openTickets.length > 0 || disputedRides.length > 0) {
    reviewState = { key: "FLAGGED", label: "Needs review", tone: "amber" };
  } else if (completedRides.length >= 8) {
    reviewState = { key: "TRUSTED", label: "Trusted", tone: "emerald" };
  } else if (completedRides.length > 0) {
    reviewState = { key: "ESTABLISHED", label: "Established", tone: "teal" };
  }

  let activityState = { key: "DORMANT", label: "Dormant", tone: "slate" };
  if (activeRequests.length > 0) {
    activityState = { key: "LIVE", label: "Live request", tone: "orange" };
  } else if (hasRecentActivity(latestRideTimestamp || latestTicketTimestamp, 14)) {
    activityState = { key: "RECENT", label: "Recent activity", tone: "teal" };
  } else if (riderRides.length > 0 || riderTickets.length > 0) {
    activityState = { key: "OCCASIONAL", label: "Occasional", tone: "violet" };
  }

  const tags = [];
  if (activeRequests.length > 0) {
    tags.push({ label: `${activeRequests.length} live request${activeRequests.length === 1 ? "" : "s"}`, tone: "orange" });
  }
  if (openTickets.length > 0) {
    tags.push({ label: `${openTickets.length} open issue${openTickets.length === 1 ? "" : "s"}`, tone: "amber" });
  }
  if (completedRides.length >= 10) {
    tags.push({ label: "Repeat rider", tone: "emerald" });
  }
  if (hasRecentActivity(joinedTimestamp, 30)) {
    tags.push({ label: "Recently joined", tone: "sky" });
  }
  if (!tags.length) {
    tags.push({ label: "Healthy account", tone: "slate" });
  }

  return {
    ...rider,
    name: `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "Unknown Rider",
    riderCode: formatRiderCode(rider.id),
    rides: riderRides,
    tickets: riderTickets,
    totalRides: riderRides.length,
    completedRides: completedRides.length,
    disputedRides: disputedRides.length,
    activeRequests: activeRequests.length,
    openIssues: openTickets.length,
    latestRide: riderRides[0] || null,
    latestTicket: riderTickets[0] || null,
    joinedLabel: formatDate(rider.createdAt),
    lastActivityLabel: formatRelativeTime(lastActivityTimestamp || rider.createdAt),
    lastActivityTimestamp,
    accountState,
    reviewState,
    activityState,
    tags
  };
}

function StatusPill({ label, tone, icon: Icon }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getToneStyles(tone)}`}>
      {Icon ? <Icon className="text-[12px]" /> : null}
      {label}
    </span>
  );
}

function ActionButton({ children, icon: Icon, onClick, disabled = false, variant = "secondary", className = "", type = "button" }) {
  const styles = {
    primary: "border-transparent bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
    >
      {Icon ? <Icon className="text-base" /> : null}
      {children}
    </button>
  );
}

function SummaryCard({ label, value, helper, icon: Icon, tone = "teal" }) {
  const accent = {
    teal: "from-teal-500/12 via-teal-500/6 to-transparent text-teal-700",
    emerald: "from-emerald-500/12 via-emerald-500/6 to-transparent text-emerald-700",
    amber: "from-amber-500/12 via-amber-500/6 to-transparent text-amber-700",
    rose: "from-rose-500/12 via-rose-500/6 to-transparent text-rose-700",
    sky: "from-sky-500/12 via-sky-500/6 to-transparent text-sky-700",
    slate: "from-slate-500/12 via-slate-500/6 to-transparent text-slate-700"
  }[tone];

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 ${accent}`}>
        <Icon className="text-xl" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        <p className="text-xs font-medium text-slate-400">{helper}</p>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange, icon: Icon }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {Icon ? <Icon className="text-sm" /> : null}
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[28px] border border-white/70 bg-white/75 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.35)]"
          />
        ))}
      </div>
      <div className="h-[520px] animate-pulse rounded-[32px] border border-white/70 bg-white/75 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.35)]" />
    </div>
  );
}

function MetricTile({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function RiderTableRow({
  rider,
  selected,
  onSelect,
  onViewProfile,
  onOpenHistory,
  onStartEdit,
  onToggleActive,
  onOpenIssues,
  updating
}) {
  return (
    <tr
      className={`cursor-pointer border-t border-slate-200 transition ${selected ? "bg-teal-50/80" : "bg-white hover:bg-slate-50/90"}`}
      onClick={() => onSelect(rider.id)}
    >
      <td className="px-4 py-4 align-top">
        <div className="flex items-start gap-3">
          <Avatar name={rider.name} size="md" className="shadow-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{rider.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{rider.riderCode}</p>
            <p className="mt-2 truncate text-sm text-slate-500">{rider.email || "No email"}</p>
            <p className="truncate text-sm text-slate-500">{rider.phoneNumber || "No phone"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <StatusPill label={rider.accountState.label} tone={rider.accountState.tone} icon={FiShield} />
          <StatusPill label={rider.reviewState.label} tone={rider.reviewState.tone} icon={FiCheckCircle} />
          <StatusPill label={rider.activityState.label} tone={rider.activityState.tone} icon={FiActivity} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {rider.tags.slice(0, 2).map((tag) => (
            <span key={tag.label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${getToneStyles(tag.tone)}`}>
              {tag.label}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Total rides</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{formatCompactNumber(rider.totalRides)}</p>
            <p className="text-xs text-slate-500">{rider.completedRides} completed</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Latest activity</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{rider.lastActivityLabel}</p>
            <p className="text-xs text-slate-500">Joined {rider.joinedLabel}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onViewProfile(rider);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <FiEye className="text-base" />
            View
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenHistory(rider);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <FiClock className="text-base" />
            Rides
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onStartEdit(rider);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <FiEdit3 className="text-base" />
            Edit
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenIssues(rider);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <FiFlag className="text-base" />
            Issues
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleActive(rider, !rider.active);
            }}
            disabled={updating}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              rider.active === false
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {rider.active === false ? <FiCheckCircle className="text-base" /> : <FiSlash className="text-base" />}
            {updating ? "Updating..." : rider.active === false ? "Reactivate" : "Suspend"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function RiderMobileCard({
  rider,
  selected,
  onSelect,
  onViewProfile,
  onOpenHistory,
  onStartEdit,
  onToggleActive,
  onOpenIssues,
  updating
}) {
  return (
    <article className={`rounded-[28px] border p-5 shadow-[0_24px_45px_-38px_rgba(15,23,42,0.45)] transition ${
      selected ? "border-teal-200 bg-teal-50/70" : "border-slate-200 bg-white/95"
    }`}>
      <button type="button" onClick={() => onSelect(rider.id)} className="flex w-full items-start gap-3 text-left">
        <Avatar name={rider.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-950">{rider.name}</p>
            <StatusPill label={rider.activityState.label} tone={rider.activityState.tone} icon={FiActivity} />
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{rider.riderCode}</p>
          <p className="mt-2 text-sm text-slate-500">{rider.email || "No email"}</p>
          <p className="text-sm text-slate-500">{rider.phoneNumber || "No phone"} - Joined {rider.joinedLabel}</p>
        </div>
      </button>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill label={rider.accountState.label} tone={rider.accountState.tone} icon={FiShield} />
        <StatusPill label={rider.reviewState.label} tone={rider.reviewState.tone} icon={FiCheckCircle} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricTile label="Total rides" value={formatCompactNumber(rider.totalRides)} helper={`${rider.completedRides} completed`} />
        <MetricTile label="Latest activity" value={rider.lastActivityLabel} helper={`${rider.openIssues} issue(s)`} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <ActionButton icon={FiEye} onClick={() => onViewProfile(rider)}>View</ActionButton>
        <ActionButton icon={FiClock} onClick={() => onOpenHistory(rider)}>Ride History</ActionButton>
        <ActionButton icon={FiEdit3} onClick={() => onStartEdit(rider)}>Edit</ActionButton>
        <ActionButton icon={FiFlag} onClick={() => onOpenIssues(rider)}>Issues</ActionButton>
        <ActionButton
          icon={rider.active === false ? FiCheckCircle : FiSlash}
          onClick={() => onToggleActive(rider, !rider.active)}
          disabled={updating}
          variant={rider.active === false ? "secondary" : "ghost"}
          className="sm:col-span-2"
        >
          {updating ? "Updating..." : rider.active === false ? "Reactivate Account" : "Suspend Account"}
        </ActionButton>
      </div>
    </article>
  );
}

function PreviewPanel({
  rider,
  onViewProfile,
  onOpenHistory,
  onStartEdit,
  onToggleActive,
  onOpenIssues,
  onArchive,
  onOpenTicket,
  onOpenRide,
  updating,
  deleting
}) {
  if (!rider) {
    return (
      <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
        <EmptyState
          icon="🧍"
          title="Select a rider"
          description="Choose any rider from the management list to preview account health, activity, and actions."
        />
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
      <div className="flex items-start gap-4">
        <Avatar name={rider.name} size="lg" className="shadow-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-bold text-slate-950">{rider.name}</h3>
            <StatusPill label={rider.activityState.label} tone={rider.activityState.tone} icon={FiActivity} />
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">{rider.riderCode}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill label={rider.accountState.label} tone={rider.accountState.tone} icon={FiShield} />
            <StatusPill label={rider.reviewState.label} tone={rider.reviewState.tone} icon={FiCheckCircle} />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <MetricTile label="Total rides" value={formatCompactNumber(rider.totalRides)} helper={`${rider.completedRides} completed rides`} />
        <MetricTile label="Live requests" value={rider.activeRequests} helper={rider.activeRequests ? "Currently in motion" : "Queue is calm"} />
        <MetricTile label="Open issues" value={rider.openIssues} helper={`${rider.disputedRides} dispute ride(s)`} />
        <MetricTile label="Last activity" value={rider.lastActivityLabel} helper={`Joined ${rider.joinedLabel}`} />
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.08),rgba(249,115,22,0.05),rgba(255,255,255,0.92))] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account snapshot</p>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex items-start gap-3 text-slate-600">
            <FiMail className="mt-0.5 text-base text-slate-400" />
            <span className="break-all">{rider.email || "No email provided"}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiPhone className="mt-0.5 text-base text-slate-400" />
            <span>{rider.phoneNumber || "No phone number provided"}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiCalendar className="mt-0.5 text-base text-slate-400" />
            <span>Joined {rider.joinedLabel}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiMapPin className="mt-0.5 text-base text-slate-400" />
            <span>
              {rider.latestRide ? `${rider.latestRide.pickupAddress} to ${rider.latestRide.dropoffAddress}` : "No ride history yet"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Attention flags</p>
            <p className="mt-1 text-sm text-slate-500">Signals that may need admin follow-up.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {rider.lastActivityLabel}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {rider.tags.map((tag) => (
            <span key={tag.label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${getToneStyles(tag.tone)}`}>
              {tag.label}
            </span>
          ))}
        </div>
        {rider.latestTicket ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{rider.latestTicket.subject}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDateTime(rider.latestTicket.createdAt)}</p>
              </div>
              <ActionButton icon={FiMessageSquare} onClick={() => onOpenTicket(rider.latestTicket)} className="px-3 py-2">
                Open
              </ActionButton>
            </div>
          </div>
        ) : rider.latestRide ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Latest ride #{rider.latestRide.id}</p>
                <p className="mt-1 text-sm text-slate-500">{rider.latestRide.pickupAddress} to {rider.latestRide.dropoffAddress}</p>
              </div>
              <ActionButton icon={FiEye} onClick={() => onOpenRide(rider.latestRide)} className="px-3 py-2">
                Inspect
              </ActionButton>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No issues or ride history are recorded for this rider yet.</p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <ActionButton icon={FiEye} onClick={() => onViewProfile(rider)} className="w-full">
          View Profile
        </ActionButton>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton icon={FiClock} onClick={() => onOpenHistory(rider)}>
            Ride History
          </ActionButton>
          <ActionButton icon={FiEdit3} onClick={() => onStartEdit(rider)}>
            Edit Account
          </ActionButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={rider.phoneNumber ? `tel:${rider.phoneNumber}` : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              rider.phoneNumber
                ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            }`}
            onClick={(event) => {
              if (!rider.phoneNumber) {
                event.preventDefault();
              }
            }}
          >
            <FiPhone className="text-base" />
            Contact Rider
          </a>
          <ActionButton icon={FiFlag} onClick={() => onOpenIssues(rider)}>
            Review Issues
          </ActionButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton
            icon={rider.active === false ? FiCheckCircle : FiSlash}
            onClick={() => onToggleActive(rider, !rider.active)}
            disabled={updating}
            variant={rider.active === false ? "secondary" : "ghost"}
          >
            {updating ? "Updating..." : rider.active === false ? "Reactivate Account" : "Suspend Account"}
          </ActionButton>
          <ActionButton icon={FiXCircle} onClick={() => onArchive(rider)} disabled={deleting} variant="danger">
            {deleting ? "Archiving..." : "Archive Account"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export default function RidersManagementWorkspace({
  riders,
  rides,
  tickets,
  loading,
  error,
  insightsLoading = false,
  insightsWarning = "",
  onRefresh,
  onViewDetails,
  onViewRide,
  onViewTicket,
  onUpdateRider,
  onArchiveRider,
  pendingUpdateRiderId,
  pendingDeleteRiderId
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [activityFilter, setActivityFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL");
  const [sortBy, setSortBy] = useState("ISSUE_PRIORITY");
  const [currentPage, setCurrentPage] = useState(1);
  const [previewRiderId, setPreviewRiderId] = useState(null);
  const [historyRider, setHistoryRider] = useState(null);
  const [issuesRider, setIssuesRider] = useState(null);
  const [archiveCandidate, setArchiveCandidate] = useState(null);
  const [editingRider, setEditingRider] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    active: true
  });
  const [formError, setFormError] = useState("");

  const riderRecords = useMemo(
    () => riders.map((rider) => buildRiderRecord(rider, rides || [], tickets || [])),
    [riders, rides, tickets]
  );

  const summary = useMemo(() => {
    return {
      totalRiders: riderRecords.length,
      activeRequests: riderRecords.reduce((sum, rider) => sum + rider.activeRequests, 0),
      reviewedAccounts: riderRecords.filter((rider) => rider.reviewState.key === "TRUSTED" || rider.reviewState.key === "ESTABLISHED").length,
      suspendedRiders: riderRecords.filter((rider) => rider.active === false).length,
      recentlyJoined: riderRecords.filter((rider) => hasRecentActivity(rider.createdAt, 30)).length,
      issueWatch: riderRecords.filter((rider) => rider.reviewState.key === "FLAGGED").length
    };
  }, [riderRecords]);

  const filteredRiders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    return riderRecords
      .filter((rider) => {
        const matchesQuery = !query || [
          rider.name,
          rider.riderCode,
          rider.email,
          rider.phoneNumber
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

        const matchesStatus = statusFilter === "ALL" ? true : rider.accountState.key === statusFilter;
        const matchesReview = reviewFilter === "ALL" ? true : rider.reviewState.key === reviewFilter;
        const matchesActivity = activityFilter === "ALL" ? true : rider.activityState.key === activityFilter;
        const matchesDate =
          dateRange === "ALL" || !rider.createdAt
            ? true
            : now - new Date(rider.createdAt).getTime() <= Number(dateRange) * 24 * 60 * 60 * 1000;

        return matchesQuery && matchesStatus && matchesReview && matchesActivity && matchesDate;
      })
      .sort((left, right) => {
        if (sortBy === "ISSUE_PRIORITY") {
          if (left.reviewState.key === "FLAGGED" && right.reviewState.key !== "FLAGGED") return -1;
          if (left.reviewState.key !== "FLAGGED" && right.reviewState.key === "FLAGGED") return 1;
          return right.lastActivityTimestamp - left.lastActivityTimestamp;
        }
        if (sortBy === "LATEST") {
          return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
        }
        if (sortBy === "OLDEST") {
          return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
        }
        if (sortBy === "MOST_RIDES") {
          return right.totalRides - left.totalRides;
        }
        if (sortBy === "LAST_ACTIVITY") {
          return right.lastActivityTimestamp - left.lastActivityTimestamp;
        }
        return 0;
      });
  }, [activityFilter, dateRange, reviewFilter, riderRecords, search, sortBy, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRiders.length / PAGE_SIZE));
  const paginatedRiders = filteredRiders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const previewRider = riderRecords.find((rider) => rider.id === previewRiderId) || filteredRiders[0] || null;
  const activeFilterCount = [statusFilter, reviewFilter, activityFilter, dateRange].filter((value) => value !== "ALL").length + (search.trim() ? 1 : 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [activityFilter, dateRange, reviewFilter, search, sortBy, statusFilter]);

  useEffect(() => {
    if (!previewRiderId && filteredRiders[0]) {
      setPreviewRiderId(filteredRiders[0].id);
      return;
    }

    if (previewRiderId && !filteredRiders.some((rider) => rider.id === previewRiderId)) {
      setPreviewRiderId(filteredRiders[0]?.id || null);
    }
  }, [filteredRiders, previewRiderId]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-white/95 p-8 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
        <EmptyState
          icon="⚠️"
          title="Rider accounts could not be loaded"
          description="The admin workspace hit an error while loading rider records."
          action={
            <ActionButton icon={FiRefreshCw} onClick={onRefresh}>
              Retry load
            </ActionButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),360px]">
        <section className="rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92),rgba(255,247,237,0.92))] p-6 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Rider Accounts</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Riders Management</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                A premium customer-operations workspace for account review, ride visibility, issue triage, and safe account intervention without mixing rider workflows into driver or support queues.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ActionButton icon={FiDownload} onClick={() => {
                const csv = [
                  ["Rider ID", "Name", "Email", "Phone", "Status", "Review State", "Total Rides", "Latest Activity", "Joined"],
                  ...filteredRiders.map((rider) => [
                    rider.riderCode,
                    rider.name,
                    rider.email || "",
                    rider.phoneNumber || "",
                    rider.accountState.label,
                    rider.reviewState.label,
                    String(rider.totalRides),
                    rider.lastActivityLabel,
                    rider.joinedLabel
                  ])
                ]
                  .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(","))
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "kituirides-riders.csv";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}>
                Export
              </ActionButton>
              <ActionButton icon={FiRefreshCw} onClick={onRefresh}>
                Refresh
              </ActionButton>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {summary.totalRiders} rider accounts
            </span>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              {summary.activeRequests} active request{summary.activeRequests === 1 ? "" : "s"}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              {summary.issueWatch} account{summary.issueWatch === 1 ? "" : "s"} on watch
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {filteredRiders.length} visible result{filteredRiders.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>

        <aside className="rounded-[34px] border border-white/70 bg-white/92 p-6 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Workspace Pulse</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-teal-200 bg-teal-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-teal-900">Active requests</p>
                <FiActivity className="text-lg text-teal-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-teal-800">{summary.activeRequests}</p>
              <p className="mt-2 text-sm text-teal-900/80">
                {summary.activeRequests ? "Customers currently moving through request and trip flow." : "No live rider requests right now. The queue is calm."}
              </p>
            </div>

            <div className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-sky-900">Recent joiners</p>
                <FiTrendingUp className="text-lg text-sky-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-sky-800">{summary.recentlyJoined}</p>
              <p className="mt-2 text-sm text-sky-900/80">Rider accounts created in the last 30 days.</p>
            </div>

            <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-amber-900">Issue watch</p>
                <FiAlertTriangle className="text-lg text-amber-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-amber-800">{summary.issueWatch}</p>
              <p className="mt-2 text-sm text-amber-900/80">Rider accounts with open support issues or dispute history.</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard label="Total Riders" value={summary.totalRiders} helper="Customer base" icon={FiUsers} tone="teal" />
        <SummaryCard label="Active Requests" value={summary.activeRequests} helper="Live trip demand" icon={FiActivity} tone="emerald" />
        <SummaryCard label="Reviewed Accounts" value={summary.reviewedAccounts} helper="Healthy rider profiles" icon={FiCheckCircle} tone="sky" />
        <SummaryCard label="Suspended Riders" value={summary.suspendedRiders} helper="Restricted access" icon={FiSlash} tone="rose" />
        <SummaryCard label="Recently Joined" value={summary.recentlyJoined} helper="Last 30 days" icon={FiCalendar} tone="slate" />
        <SummaryCard label="Issue Watch" value={summary.issueWatch} helper="Needs attention" icon={FiFlag} tone="amber" />
      </div>

      {insightsWarning ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(146,64,14,0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <FiAlertTriangle className="text-lg" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Some rider insights are temporarily unavailable</p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  Core rider accounts are still loaded, but ride history or support-derived indicators may be partially incomplete. {insightsWarning}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {insightsLoading ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Refreshing insights
                </span>
              ) : null}
              <ActionButton icon={FiRefreshCw} onClick={onRefresh}>Retry</ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[32px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)] lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr),repeat(3,minmax(0,0.75fr))]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FiSearch className="text-sm" />
              Search riders
            </span>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, phone, rider ID, or plate number"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              />
            </div>
          </label>

          <FilterSelect label="Account status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} icon={FiShield} />
          <FilterSelect label="Review state" value={reviewFilter} options={REVIEW_OPTIONS} onChange={setReviewFilter} icon={FiCheckCircle} />
          <FilterSelect label="Sort" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} icon={FiGrid} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr)),auto,auto]">
          <FilterSelect label="Activity" value={activityFilter} options={ACTIVITY_OPTIONS} onChange={setActivityFilter} icon={FiActivity} />
          <FilterSelect label="Date joined" value={dateRange} options={DATE_OPTIONS} onChange={setDateRange} icon={FiCalendar} />
          <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.06),rgba(255,255,255,0.96))] px-4 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FiUsers className="text-sm" />
              Results
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{filteredRiders.length}</p>
            <p className="mt-1 text-sm text-slate-500">matching account(s)</p>
          </div>
          <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,rgba(148,163,184,0.12),rgba(255,255,255,0.96))] px-4 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FiFilter className="text-sm" />
              Filters
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{activeFilterCount}</p>
            <p className="mt-1 text-sm text-slate-500">active control(s)</p>
          </div>
          <div className="flex items-end">
            <ActionButton
              icon={FiRefreshCw}
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setReviewFilter("ALL");
                setActivityFilter("ALL");
                setDateRange("ALL");
                setSortBy("ISSUE_PRIORITY");
              }}
              variant="ghost"
            >
              Reset filters
            </ActionButton>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <section className="rounded-[32px] border border-white/70 bg-white/92 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 lg:px-6">
            <div>
              <p className="text-lg font-semibold text-slate-950">Rider roster</p>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredRiders.length} rider result(s) across {totalPages} page(s)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Active {riderRecords.filter((rider) => rider.active !== false).length}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Suspended {riderRecords.filter((rider) => rider.active === false).length}
              </span>
            </div>
          </div>

          {!filteredRiders.length ? (
            <div className="px-5 py-10 lg:px-6">
              <EmptyState
                icon="🔎"
                title="No rider accounts match these filters"
                description="Adjust the search and filters to bring more rider records back into view."
                action={
                  <ActionButton
                    icon={FiRefreshCw}
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      setReviewFilter("ALL");
                      setActivityFilter("ALL");
                      setDateRange("ALL");
                      setSortBy("ISSUE_PRIORITY");
                    }}
                  >
                    Reset filters
                  </ActionButton>
                }
              />
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="max-h-[820px] overflow-auto">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <th className="px-4 py-4">Rider</th>
                        <th className="px-4 py-4">Account health</th>
                        <th className="px-4 py-4">Activity</th>
                        <th className="px-4 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRiders.map((rider) => (
                        <RiderTableRow
                          key={rider.id}
                          rider={rider}
                          selected={previewRider?.id === rider.id}
                          onSelect={setPreviewRiderId}
                          onViewProfile={onViewDetails}
                          onOpenHistory={setHistoryRider}
                          onStartEdit={(selectedRider) => {
                            setEditingRider(selectedRider);
                            setEditForm({
                              firstName: selectedRider.firstName || "",
                              lastName: selectedRider.lastName || "",
                              email: selectedRider.email || "",
                              phoneNumber: selectedRider.phoneNumber || "",
                              active: selectedRider.active !== false
                            });
                            setFormError("");
                          }}
                          onToggleActive={async (selectedRider, active) => {
                            try {
                              await onUpdateRider(selectedRider, { active });
                            } catch (updateError) {
                              return;
                            }
                          }}
                          onOpenIssues={setIssuesRider}
                          updating={pendingUpdateRiderId === rider.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5 lg:hidden">
                {paginatedRiders.map((rider) => (
                  <RiderMobileCard
                    key={rider.id}
                    rider={rider}
                    selected={previewRider?.id === rider.id}
                    onSelect={setPreviewRiderId}
                    onViewProfile={onViewDetails}
                    onOpenHistory={setHistoryRider}
                    onStartEdit={(selectedRider) => {
                      setEditingRider(selectedRider);
                      setEditForm({
                        firstName: selectedRider.firstName || "",
                        lastName: selectedRider.lastName || "",
                        email: selectedRider.email || "",
                        phoneNumber: selectedRider.phoneNumber || "",
                        active: selectedRider.active !== false
                      });
                      setFormError("");
                    }}
                    onToggleActive={async (selectedRider, active) => {
                      try {
                        await onUpdateRider(selectedRider, { active });
                      } catch {
                        return;
                      }
                    }}
                    onOpenIssues={setIssuesRider}
                    updating={pendingUpdateRiderId === rider.id}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 lg:px-6">
                <p className="text-sm text-slate-500">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <FiChevronLeft className="text-base" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <FiChevronRight className="text-base" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <PreviewPanel
            rider={previewRider}
            onViewProfile={onViewDetails}
            onOpenHistory={setHistoryRider}
            onStartEdit={(selectedRider) => {
              setEditingRider(selectedRider);
              setEditForm({
                firstName: selectedRider.firstName || "",
                lastName: selectedRider.lastName || "",
                email: selectedRider.email || "",
                phoneNumber: selectedRider.phoneNumber || "",
                active: selectedRider.active !== false
              });
              setFormError("");
            }}
            onToggleActive={async (selectedRider, active) => {
              try {
                await onUpdateRider(selectedRider, { active });
              } catch {
                return;
              }
            }}
            onOpenIssues={setIssuesRider}
            onArchive={setArchiveCandidate}
            onOpenTicket={onViewTicket}
            onOpenRide={onViewRide}
            updating={pendingUpdateRiderId === previewRider?.id}
            deleting={pendingDeleteRiderId === previewRider?.id}
          />

          <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Admin notes</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiTrendingUp className="text-base text-teal-600" />
                  Growth view
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Focus on recently joined riders with early activity so admin friction does not slow down first-trip conversion.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiLifeBuoy className="text-base text-orange-600" />
                  Support crossover
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Rider issues stay visible here through open support signals, without crowding the broader support workspace.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiUser className="text-base text-sky-600" />
                  Workflow intent
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Use the roster for fast scanning, the preview panel for quick judgment, and ride history or issue panels when you need operational context.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(historyRider)}
        title={historyRider ? `Ride History • ${historyRider.name}` : "Ride History"}
        onClose={() => setHistoryRider(null)}
        size="2xl"
      >
        {historyRider ? (
          historyRider.rides.length ? (
            <div className="space-y-3">
              {historyRider.rides.slice(0, 12).map((ride) => (
                <div key={ride.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">Ride #{ride.id}</p>
                      <p className="mt-1 text-sm text-slate-600">{ride.pickupAddress} to {ride.dropoffAddress}</p>
                      <p className="mt-2 text-xs font-medium text-slate-500">{formatDateTime(ride.requestedAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={ride.status} tone={ride.status === "DISPUTED" ? "amber" : "sky"} />
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {formatMoney(ride.finalFare || ride.estimatedFare)}
                      </span>
                      <ActionButton icon={FiEye} onClick={() => onViewRide(ride)} className="px-3 py-2">
                        Open
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="🛣️"
              title="No ride history yet"
              description="This rider has not completed or requested any rides yet."
            />
          )
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(issuesRider)}
        title={issuesRider ? `Issues & Flags • ${issuesRider.name}` : "Issues & Flags"}
        onClose={() => setIssuesRider(null)}
        size="xl"
      >
        {issuesRider ? (
          issuesRider.tickets.length ? (
            <div className="space-y-3">
              {issuesRider.tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{ticket.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
                      <p className="mt-2 text-xs font-medium text-slate-500">{formatDateTime(ticket.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill label={ticket.status} tone={ticket.status === "RESOLVED" ? "emerald" : "amber"} />
                      <ActionButton icon={FiMessageSquare} onClick={() => onViewTicket(ticket)} className="px-3 py-2">
                        Open Ticket
                      </ActionButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="🛡️"
              title="No open rider issues"
              description="This rider account currently has no support tickets or flagged issue history."
            />
          )
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(editingRider)}
        title={editingRider ? `Edit Rider Account • ${editingRider.name}` : "Edit Rider Account"}
        onClose={() => {
          setEditingRider(null);
          setFormError("");
        }}
        size="lg"
      >
        {editingRider ? (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setFormError("");
              try {
                await onUpdateRider(editingRider, editForm);
                setEditingRider(null);
              } catch (updateError) {
                setFormError(updateError?.response?.data?.message || "Failed to update rider account.");
              }
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="First Name"
                value={editForm.firstName}
                onChange={(event) => setEditForm((current) => ({ ...current, firstName: event.target.value }))}
                required
              />
              <Input
                label="Last Name"
                value={editForm.lastName}
                onChange={(event) => setEditForm((current) => ({ ...current, lastName: event.target.value }))}
                required
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <Input
              label="Phone Number"
              value={editForm.phoneNumber}
              onChange={(event) => setEditForm((current) => ({ ...current, phoneNumber: event.target.value }))}
              required
            />
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Account Status</span>
              <select
                value={editForm.active ? "ACTIVE" : "SUSPENDED"}
                onChange={(event) => setEditForm((current) => ({ ...current, active: event.target.value === "ACTIVE" }))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>
            {formError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
            <ActionButton
              icon={FiCheckCircle}
              variant="primary"
              disabled={pendingUpdateRiderId === editingRider.id}
              className="w-full"
              type="submit"
            >
              {pendingUpdateRiderId === editingRider.id ? "Saving..." : "Save Rider Changes"}
            </ActionButton>
          </form>
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(archiveCandidate)}
        title={archiveCandidate ? `Archive ${archiveCandidate.name}?` : "Archive rider"}
        onClose={() => setArchiveCandidate(null)}
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <ActionButton variant="ghost" onClick={() => setArchiveCandidate(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              icon={FiXCircle}
              variant="danger"
              onClick={async () => {
                if (!archiveCandidate) {
                  return;
                }
                try {
                  await onArchiveRider(archiveCandidate);
                  setArchiveCandidate(null);
                } catch {
                  return;
                }
              }}
              disabled={pendingDeleteRiderId === archiveCandidate?.id}
            >
              {pendingDeleteRiderId === archiveCandidate?.id ? "Archiving..." : "Archive account"}
            </ActionButton>
          </div>
        }
      >
        {archiveCandidate ? (
          <div className="space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              This removes <span className="font-semibold text-slate-900">{archiveCandidate.name}</span> from the rider roster and permanently deletes related ride history from the admin system.
            </p>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Archive only when the account should not be retained for future rider recovery or reporting.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
