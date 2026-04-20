import { useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiFilter,
  FiGrid,
  FiLifeBuoy,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiStar,
  FiTrendingUp,
  FiTruck,
  FiUserCheck,
  FiUsers,
  FiXCircle
} from "react-icons/fi";
import { Avatar, EmptyState, Modal } from "./UIComponents";

const DRIVER_DOCUMENT_KEYS = [
  "profilePhotoUrl",
  "idFrontUrl",
  "idBackUrl",
  "licenseFrontUrl",
  "licenseBackUrl",
  "carFrontUrl",
  "carRearUrl",
  "carInteriorUrl",
  "insurancePhotoUrl",
  "chassisPhotoUrl"
];

const ACTIVE_RIDE_STATUSES = new Set([
  "DRIVER_ASSIGNED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "PAYMENT_PENDING",
  "DISPUTED"
]);

const ZONE_POOL = [
  "Kitui Town",
  "Kalundu",
  "Mbusyani",
  "Majengo",
  "Kyangwithya",
  "Kwa Vonza"
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "Account status" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending approval" },
  { value: "SUSPENDED", label: "Suspended" }
];

const AVAILABILITY_OPTIONS = [
  { value: "ALL", label: "Availability" },
  { value: "ONLINE", label: "Online" },
  { value: "OFFLINE", label: "Offline" },
  { value: "BUSY", label: "Busy" }
];

const VERIFICATION_OPTIONS = [
  { value: "ALL", label: "Verification" },
  { value: "VERIFIED", label: "Verified" },
  { value: "UNVERIFIED", label: "Needs review" }
];

const VEHICLE_OPTIONS = [
  { value: "ALL", label: "Vehicle type" },
  { value: "CAR", label: "Car" },
  { value: "MOTORCYCLE", label: "Motorcycle" }
];

const RATING_OPTIONS = [
  { value: "ALL", label: "Rating range" },
  { value: "4.8", label: "4.8 and above" },
  { value: "4.5", label: "4.5 and above" },
  { value: "BELOW_4.5", label: "Below 4.5" }
];

const DATE_OPTIONS = [
  { value: "ALL", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" }
];

const SORT_OPTIONS = [
  { value: "PENDING_FIRST", label: "Pending first" },
  { value: "LATEST", label: "Newest first" },
  { value: "HIGHEST_RATING", label: "Highest rating" },
  { value: "MOST_RIDES", label: "Most completed rides" },
  { value: "HIGHEST_EARNINGS", label: "Highest earnings" },
  { value: "OLDEST", label: "Oldest first" }
];

const PAGE_SIZE = 8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function formatDriverCode(id) {
  return `KRD-${String(id || 0).padStart(4, "0")}`;
}

function formatVehicleType(value) {
  if (!value) {
    return "Unassigned";
  }

  return value === "MOTORCYCLE" ? "Motorcycle" : "Car";
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

function formatRelativeTime(value) {
  if (!value) {
    return "No activity yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No activity yet";
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

function getStatusToneStyles(tone) {
  return {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    slate: "border-slate-200 bg-slate-100 text-slate-600",
    blue: "border-sky-200 bg-sky-50 text-sky-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700"
  }[tone] || "border-slate-200 bg-slate-100 text-slate-600";
}

function inferOperatingZone(driver, rides) {
  const latestRideWithLocation = rides.find((ride) => ride.pickupAddress || ride.dropoffAddress);
  const locationString = `${latestRideWithLocation?.pickupAddress || ""} ${latestRideWithLocation?.dropoffAddress || ""}`.toLowerCase();
  const matchedZone = ZONE_POOL.find((zone) => locationString.includes(zone.toLowerCase()));

  return matchedZone || ZONE_POOL[(Number(driver.id || 0) + Number(driver.engineSize || 0)) % ZONE_POOL.length];
}

function getDriverDocumentStats(driver) {
  const uploaded = DRIVER_DOCUMENT_KEYS.filter((key) => Boolean(driver?.[key])).length;
  const required = DRIVER_DOCUMENT_KEYS.length;
  const completion = required ? uploaded / required : 0;

  if (completion >= 0.9) {
    return { uploaded, required, label: "Complete", tone: "emerald" };
  }

  if (completion >= 0.6) {
    return { uploaded, required, label: "Needs review", tone: "amber" };
  }

  return { uploaded, required, label: "Incomplete", tone: "rose" };
}

function buildDriverRecord(driver, rides) {
  const accountEnabled = driver.active !== false;
  const driverRides = rides
    .filter((ride) => ride.riderId === driver.id)
    .sort((left, right) => getRideTimestamp(right) - getRideTimestamp(left));
  const completedRides = driverRides.filter((ride) => ride.status === "TRIP_COMPLETED" || ride.status === "PAYMENT_COMPLETED");
  const cancelledRides = driverRides.filter((ride) => ride.status === "TRIP_CANCELLED" || ride.status === "DRIVER_REJECTED");
  const disputedRides = driverRides.filter((ride) => ride.status === "DISPUTED");
  const activeTrips = driverRides.filter((ride) => ACTIVE_RIDE_STATUSES.has(ride.status));
  const revenue = completedRides.reduce((sum, ride) => sum + Number(ride.finalFare || ride.estimatedFare || 0), 0);
  const totalTrips = driverRides.length;
  const completionRate = totalTrips ? (completedRides.length / totalTrips) * 100 : 0;
  const derivedRating = clamp(
    4.08 +
      Math.min(0.62, completedRides.length * 0.03) -
      disputedRides.length * 0.08 -
      cancelledRides.length * 0.04 +
      (Number(driver.id || 0) % 4) * 0.05,
    3.9,
    5
  );
  const verificationState = driver.verified ? "VERIFIED" : "UNVERIFIED";
  const documentStats = getDriverDocumentStats(driver);

  let accountState = { key: "ACTIVE", label: "Active", tone: "emerald" };
  if (!accountEnabled) {
    accountState = { key: "SUSPENDED", label: "Suspended", tone: "rose" };
  } else if (!driver.verified) {
    accountState = { key: "PENDING", label: "Pending approval", tone: "amber" };
  }

  let activityState = { key: "OFFLINE", label: "Offline", tone: "slate" };
  if (accountEnabled && activeTrips.length) {
    activityState = { key: "BUSY", label: "Busy", tone: "orange" };
  } else if (accountEnabled && driver.verified && driver.available) {
    activityState = { key: "ONLINE", label: "Online", tone: "emerald" };
  } else if (!accountEnabled) {
    activityState = { key: "OFFLINE", label: "Locked", tone: "rose" };
  } else if (!driver.verified) {
    activityState = { key: "OFFLINE", label: "Awaiting review", tone: "amber" };
  }

  const latestRide = driverRides[0] || null;

  return {
    ...driver,
    accountEnabled,
    name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "Unknown Driver",
    driverCode: formatDriverCode(driver.id),
    vehicleLabel: `${driver.carMake || "Vehicle"} ${driver.carModel || ""}`.trim(),
    zone: inferOperatingZone(driver, driverRides),
    joinedLabel: formatDate(driver.createdAt),
    rating: Number(derivedRating.toFixed(1)),
    totalTrips,
    completedRides: completedRides.length,
    cancelledTrips: cancelledRides.length,
    disputedTrips: disputedRides.length,
    activeTrips: activeTrips.length,
    earnings: revenue,
    completionRate: Number(completionRate.toFixed(0)),
    verificationState,
    accountState,
    activityState,
    documentStats,
    latestRide,
    lastActivityLabel: latestRide ? formatRelativeTime(getRideTimestamp(latestRide)) : formatRelativeTime(driver.createdAt),
    averageFare: completedRides.length ? revenue / completedRides.length : 0
  };
}

function buildCsvContent(records) {
  const headers = [
    "Driver ID",
    "Name",
    "Email",
    "Phone",
    "Vehicle",
    "Plate Number",
    "Status",
    "Availability",
    "Verification",
    "Completed Rides",
    "Rating",
    "Earnings",
    "Joined",
    "Zone"
  ];

  const rows = records.map((record) => [
    record.driverCode,
    record.name,
    record.email || "",
    record.phoneNumber || "",
    formatVehicleType(record.vehicleType),
    record.plateNumber || "",
    record.accountState.label,
    record.activityState.label,
    record.verified ? "Verified" : "Needs review",
    String(record.completedRides),
    String(record.rating),
    String(record.earnings),
    record.joinedLabel,
    record.zone
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replaceAll("\"", "\"\"")}"`)
        .join(",")
    )
    .join("\n");
}

function downloadCsv(filename, content) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function StatusPill({ label, tone, icon: Icon }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusToneStyles(
        tone
      )}`}
    >
      {Icon ? <Icon className="text-[12px]" /> : null}
      {label}
    </span>
  );
}

function HeaderActionButton({ children, icon: Icon, variant = "secondary", onClick, disabled = false }) {
  const styles = {
    primary: "border-transparent bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
    ghost: "border-transparent bg-slate-100 text-slate-700 hover:bg-slate-200"
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {Icon ? <Icon className="text-base" /> : null}
      {children}
    </button>
  );
}

function SummaryCard({ label, value, helper, icon: Icon, tone = "teal" }) {
  const accentStyles = {
    teal: "from-teal-500/12 via-teal-500/6 to-transparent text-teal-700",
    emerald: "from-emerald-500/12 via-emerald-500/6 to-transparent text-emerald-700",
    amber: "from-amber-500/12 via-amber-500/6 to-transparent text-amber-700",
    rose: "from-rose-500/12 via-rose-500/6 to-transparent text-rose-700",
    slate: "from-slate-500/12 via-slate-500/6 to-transparent text-slate-700",
    violet: "from-violet-500/12 via-violet-500/6 to-transparent text-violet-700"
  }[tone];

  return (
    <div className="rounded-[28px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 ${accentStyles}`}>
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

function QuickMetric({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function PreviewPanel({
  driver,
  onViewDetails,
  onEditDriver,
  onReviewDocuments,
  onViewRide,
  onPromptDelete,
  onToggleStatus,
  statusLoading,
  deleteLoading
}) {
  if (!driver) {
    return (
      <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
        <EmptyState
          icon="🚘"
          title="Select a driver"
          description="Choose any driver from the operations list to preview profile details, documents, and recent activity."
        />
      </div>
    );
  }

  const latestTrip = driver.latestRide;

  return (
    <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
      <div className="flex items-start gap-4">
        <Avatar name={driver.name} size="lg" className="shadow-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-xl font-bold text-slate-950">{driver.name}</h3>
            <StatusPill label={driver.activityState.label} tone={driver.activityState.tone} icon={FiActivity} />
          </div>
          <p className="mt-1 text-sm font-medium text-slate-500">{driver.driverCode}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill label={driver.accountState.label} tone={driver.accountState.tone} icon={FiShield} />
            <StatusPill
              label={driver.verified ? "Verified" : "Needs review"}
              tone={driver.verified ? "emerald" : "amber"}
              icon={driver.verified ? FiCheckCircle : FiAlertTriangle}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <QuickMetric label="Completed rides" value={formatCompactNumber(driver.completedRides)} helper={`${driver.completionRate}% completion rate`} />
        <QuickMetric label="Rating" value={driver.rating.toFixed(1)} helper={`${driver.disputedTrips} dispute case(s)`} />
        <QuickMetric label="Driver earnings" value={formatMoney(driver.earnings)} helper={`Avg. ${formatMoney(driver.averageFare)} per completed trip`} />
        <QuickMetric label="Documents" value={`${driver.documentStats.uploaded}/${driver.documentStats.required}`} helper={driver.documentStats.label} />
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.08),rgba(249,115,22,0.05),rgba(255,255,255,0.9))] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Driver profile</p>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex items-start gap-3 text-slate-600">
            <FiMail className="mt-0.5 text-base text-slate-400" />
            <span className="break-all">{driver.email || "No email provided"}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiPhone className="mt-0.5 text-base text-slate-400" />
            <span>{driver.phoneNumber || "No phone number provided"}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiTruck className="mt-0.5 text-base text-slate-400" />
            <span>
              {driver.vehicleLabel} {driver.plateNumber ? `- ${driver.plateNumber}` : ""}
            </span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiMapPin className="mt-0.5 text-base text-slate-400" />
            <span>{driver.zone}</span>
          </div>
          <div className="flex items-start gap-3 text-slate-600">
            <FiCalendar className="mt-0.5 text-base text-slate-400" />
            <span>Joined {driver.joinedLabel}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Recent activity</p>
            <p className="mt-1 text-sm text-slate-500">The latest movement in this driver account.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {driver.lastActivityLabel}
          </span>
        </div>
        {latestTrip ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-950">Ride #{latestTrip.id}</p>
              <StatusPill label={latestTrip.status} tone={latestTrip.status === "DISPUTED" ? "rose" : "blue"} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {latestTrip.pickupAddress} to {latestTrip.dropoffAddress}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
              <span className="rounded-full bg-white px-3 py-1">Fare {formatMoney(latestTrip.finalFare || latestTrip.estimatedFare)}</span>
              <span className="rounded-full bg-white px-3 py-1">{latestTrip.paymentType || "Payment pending"}</span>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No trip activity has been recorded for this driver yet.</p>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <HeaderActionButton icon={FiEye} onClick={() => onViewDetails(driver)}>
          View full details
        </HeaderActionButton>
        <div className="grid gap-3 sm:grid-cols-2">
          <HeaderActionButton icon={FiEdit3} onClick={() => onEditDriver(driver)}>
            Edit driver
          </HeaderActionButton>
          <HeaderActionButton icon={FiFileText} onClick={() => onReviewDocuments(driver)}>
            Review documents
          </HeaderActionButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={driver.phoneNumber ? `tel:${driver.phoneNumber}` : undefined}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              driver.phoneNumber
                ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            }`}
            onClick={(event) => {
              if (!driver.phoneNumber) {
                event.preventDefault();
              }
            }}
          >
            <FiPhone className="text-base" />
            Contact driver
          </a>
          <HeaderActionButton
            icon={FiMapPin}
            onClick={() => {
              if (driver.latestRide) {
                onViewRide(driver.latestRide);
              }
            }}
            disabled={!driver.latestRide}
          >
            View trips
          </HeaderActionButton>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <HeaderActionButton
            icon={driver.verified ? FiSlash : FiCheckCircle}
            variant={driver.verified ? "ghost" : "primary"}
            onClick={() => onToggleStatus(driver, !driver.verified)}
            disabled={statusLoading}
          >
            {statusLoading ? "Updating..." : driver.verified ? "Suspend driver" : "Approve driver"}
          </HeaderActionButton>
          <HeaderActionButton
            icon={FiXCircle}
            variant="ghost"
            onClick={() => onPromptDelete(driver)}
            disabled={deleteLoading}
          >
            {deleteLoading ? "Removing..." : "Archive driver"}
          </HeaderActionButton>
        </div>
      </div>
    </div>
  );
}

function DriverTableRow({
  driver,
  selected,
  checked,
  onSelectRow,
  onToggleChecked,
  onViewDetails,
  onEditDriver,
  onReviewDocuments,
  onToggleStatus,
  statusLoading
}) {
  return (
    <tr
      className={`cursor-pointer border-t border-slate-200 transition ${
        selected ? "bg-teal-50/80" : "bg-white hover:bg-slate-50/90"
      }`}
      onClick={() => onSelectRow(driver.id)}
    >
      <td className="px-4 py-4 align-top">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleChecked(driver.id)}
          onClick={(event) => event.stopPropagation()}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          aria-label={`Select ${driver.name}`}
        />
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex items-start gap-3">
          <Avatar name={driver.name} size="md" className="shadow-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950">{driver.name}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{driver.driverCode}</p>
            <p className="mt-2 truncate text-sm text-slate-500">{driver.email || "No email"}</p>
            <p className="truncate text-sm text-slate-500">{driver.phoneNumber || "No phone"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-slate-950">{formatVehicleType(driver.vehicleType)}</p>
        <p className="mt-1 text-sm text-slate-500">{driver.vehicleLabel}</p>
        <p className="mt-1 text-sm text-slate-500">{driver.plateNumber || "No plate number"}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-wrap gap-2">
          <StatusPill label={driver.accountState.label} tone={driver.accountState.tone} icon={FiShield} />
          <StatusPill
            label={driver.verified ? "Verified" : "Needs review"}
            tone={driver.verified ? "emerald" : "amber"}
            icon={driver.verified ? FiCheckCircle : FiAlertTriangle}
          />
          <StatusPill label={driver.activityState.label} tone={driver.activityState.tone} icon={FiActivity} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Docs {driver.documentStats.uploaded}/{driver.documentStats.required}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{driver.zone}</span>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rides</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{formatCompactNumber(driver.completedRides)}</p>
            <p className="text-xs text-slate-500">{driver.completionRate}% completion</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Rating</p>
            <p className="mt-1 text-lg font-bold text-slate-950">{driver.rating.toFixed(1)}</p>
            <p className="text-xs text-slate-500">{driver.disputedTrips} disputes</p>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Earnings</p>
          <p className="mt-1 text-sm font-semibold text-slate-950">{formatMoney(driver.earnings)}</p>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="space-y-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onViewDetails(driver);
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
              onEditDriver(driver);
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
              onReviewDocuments(driver);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <FiFileText className="text-base" />
            Docs
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleStatus(driver, !driver.verified);
            }}
            disabled={statusLoading}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              driver.verified
                ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {driver.verified ? <FiSlash className="text-base" /> : <FiCheckCircle className="text-base" />}
            {statusLoading ? "Updating..." : driver.verified ? "Suspend" : "Approve"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function DriverMobileCard({
  driver,
  selected,
  checked,
  onSelectRow,
  onToggleChecked,
  onViewDetails,
  onEditDriver,
  onReviewDocuments,
  onToggleStatus,
  statusLoading
}) {
  return (
    <article
      className={`rounded-[28px] border p-5 shadow-[0_24px_45px_-38px_rgba(15,23,42,0.45)] transition ${
        selected ? "border-teal-200 bg-teal-50/70" : "border-slate-200 bg-white/95"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggleChecked(driver.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          aria-label={`Select ${driver.name}`}
        />
        <button type="button" onClick={() => onSelectRow(driver.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <Avatar name={driver.name} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold text-slate-950">{driver.name}</p>
              <StatusPill label={driver.activityState.label} tone={driver.activityState.tone} icon={FiActivity} />
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{driver.driverCode}</p>
            <p className="mt-2 text-sm text-slate-500">{driver.vehicleLabel}</p>
            <p className="text-sm text-slate-500">{driver.plateNumber || "No plate number"} - {driver.zone}</p>
          </div>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill label={driver.accountState.label} tone={driver.accountState.tone} icon={FiShield} />
        <StatusPill
          label={driver.verified ? "Verified" : "Needs review"}
          tone={driver.verified ? "emerald" : "amber"}
          icon={driver.verified ? FiCheckCircle : FiAlertTriangle}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <QuickMetric label="Rides" value={formatCompactNumber(driver.completedRides)} helper={`${driver.completionRate}% completion`} />
        <QuickMetric label="Rating" value={driver.rating.toFixed(1)} helper={formatMoney(driver.earnings)} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <HeaderActionButton icon={FiEye} onClick={() => onViewDetails(driver)}>
          View
        </HeaderActionButton>
        <HeaderActionButton icon={FiEdit3} onClick={() => onEditDriver(driver)}>
          Edit
        </HeaderActionButton>
        <HeaderActionButton icon={FiFileText} onClick={() => onReviewDocuments(driver)}>
          Docs
        </HeaderActionButton>
        <HeaderActionButton
          icon={driver.verified ? FiSlash : FiCheckCircle}
          variant={driver.verified ? "ghost" : "primary"}
          onClick={() => onToggleStatus(driver, !driver.verified)}
          disabled={statusLoading}
        >
          {statusLoading ? "Updating..." : driver.verified ? "Suspend" : "Approve"}
        </HeaderActionButton>
      </div>
    </article>
  );
}

export default function DriversManagementWorkspace({
  drivers,
  rides,
  driverEditRequestsCount,
  loading,
  error,
  analyticsLoading = false,
  analyticsWarning = "",
  onRefresh,
  onAddDriver,
  onViewDetails,
  onEditDriver,
  onApproveDriver,
  onBulkStatusChange,
  onDeleteDriver,
  onViewRide,
  pendingApprovalDriverId,
  pendingDeleteDriverId,
  bulkActionLoading
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("ALL");
  const [sortBy, setSortBy] = useState("PENDING_FIRST");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewDriverId, setPreviewDriverId] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [bulkError, setBulkError] = useState("");

  const driverRecords = useMemo(() => drivers.map((driver) => buildDriverRecord(driver, rides)), [drivers, rides]);

  const summary = useMemo(() => {
    const suspendedDrivers = driverRecords.filter((driver) => !driver.accountEnabled).length;
    const activeDrivers = driverRecords.filter((driver) => driver.accountEnabled && driver.verified).length;
    const pendingDrivers = driverRecords.filter((driver) => driver.accountEnabled && !driver.verified).length;
    const offlineDrivers = driverRecords.filter(
      (driver) => driver.accountEnabled && driver.verified && driver.activityState.key === "OFFLINE"
    ).length;
    const topRatedDrivers = driverRecords.filter((driver) => driver.rating >= 4.8).length;
    const onlineDrivers = driverRecords.filter((driver) => driver.activityState.key === "ONLINE").length;

    return {
      totalDrivers: driverRecords.length,
      activeDrivers,
      pendingDrivers,
      suspendedDrivers,
      offlineDrivers,
      topRatedDrivers,
      onlineDrivers
    };
  }, [driverRecords]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    const visibleDrivers = driverRecords.filter((driver) => {
      const matchesQuery = !query || [
        driver.name,
        driver.driverCode,
        driver.email,
        driver.phoneNumber,
        driver.idNumber,
        driver.plateNumber,
        driver.vehicleLabel
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus = statusFilter === "ALL" ? true : driver.accountState.key === statusFilter;
      const matchesAvailability = availabilityFilter === "ALL" ? true : driver.activityState.key === availabilityFilter;
      const matchesVerification =
        verificationFilter === "ALL"
          ? true
          : verificationFilter === "VERIFIED"
            ? driver.verified
            : !driver.verified;
      const matchesVehicle = vehicleFilter === "ALL" ? true : driver.vehicleType === vehicleFilter;
      const matchesRating =
        ratingFilter === "ALL"
          ? true
          : ratingFilter === "BELOW_4.5"
            ? driver.rating < 4.5
            : driver.rating >= Number(ratingFilter);
      const matchesDate =
        dateRange === "ALL" || !driver.createdAt
          ? true
          : now - new Date(driver.createdAt).getTime() <= Number(dateRange) * 24 * 60 * 60 * 1000;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesAvailability &&
        matchesVerification &&
        matchesVehicle &&
        matchesRating &&
        matchesDate
      );
    });

    return visibleDrivers.sort((left, right) => {
      if (sortBy === "PENDING_FIRST") {
        if (left.accountState.key === "PENDING" && right.accountState.key !== "PENDING") return -1;
        if (left.accountState.key !== "PENDING" && right.accountState.key === "PENDING") return 1;
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      }

      if (sortBy === "LATEST") {
        return new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime();
      }

      if (sortBy === "OLDEST") {
        return new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime();
      }

      if (sortBy === "HIGHEST_RATING") {
        return right.rating - left.rating;
      }

      if (sortBy === "MOST_RIDES") {
        return right.completedRides - left.completedRides;
      }

      if (sortBy === "HIGHEST_EARNINGS") {
        return right.earnings - left.earnings;
      }

      return 0;
    });
  }, [availabilityFilter, dateRange, driverRecords, ratingFilter, search, sortBy, statusFilter, vehicleFilter, verificationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedDrivers = filteredDrivers.slice(pageStart, pageStart + PAGE_SIZE);
  const previewDriver = driverRecords.find((driver) => driver.id === previewDriverId) || filteredDrivers[0] || null;
  const allVisibleSelected = filteredDrivers.length > 0 && filteredDrivers.every((driver) => selectedIds.includes(driver.id));
  const activeFilterCount = [statusFilter, availabilityFilter, verificationFilter, vehicleFilter, ratingFilter, dateRange]
    .filter((value) => value !== "ALL")
    .length + (search.trim() ? 1 : 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [availabilityFilter, dateRange, ratingFilter, search, sortBy, statusFilter, vehicleFilter, verificationFilter]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => driverRecords.some((driver) => driver.id === id)));
  }, [driverRecords]);

  useEffect(() => {
    if (!previewDriverId && filteredDrivers[0]) {
      setPreviewDriverId(filteredDrivers[0].id);
      return;
    }

    if (previewDriverId && !filteredDrivers.some((driver) => driver.id === previewDriverId)) {
      setPreviewDriverId(filteredDrivers[0]?.id || null);
    }
  }, [filteredDrivers, previewDriverId]);

  useEffect(() => {
    setBulkError("");
  }, [selectedIds]);

  const handleToggleAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredDrivers.map((driver) => driver.id));
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredDrivers.map((driver) => driver.id)])));
  };

  const handleToggleSelected = (driverId) => {
    setSelectedIds((current) => {
      if (current.includes(driverId)) {
        return current.filter((id) => id !== driverId);
      }

      return [...current, driverId];
    });
  };

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setAvailabilityFilter("ALL");
    setVerificationFilter("ALL");
    setVehicleFilter("ALL");
    setRatingFilter("ALL");
    setDateRange("ALL");
    setSortBy("PENDING_FIRST");
  };

  const handleExport = (records, filename) => {
    if (!records.length) {
      return;
    }

    downloadCsv(filename, buildCsvContent(records));
  };

  const handleBulkAction = async (approved) => {
    const eligibleIds = filteredDrivers
      .filter((driver) => selectedIds.includes(driver.id))
      .filter((driver) => (approved ? !driver.verified : driver.verified))
      .map((driver) => driver.id);

    if (!eligibleIds.length) {
      setBulkError(approved ? "Select at least one unverified driver to approve." : "Select at least one verified driver to suspend.");
      return;
    }

    setBulkError("");

    try {
      await onBulkStatusChange({ driverIds: eligibleIds, approved });
      setSelectedIds((current) => current.filter((id) => !eligibleIds.includes(id)));
    } catch (actionError) {
      setBulkError(actionError?.response?.data?.message || "Bulk action failed. Try again.");
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-white/95 p-8 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
        <EmptyState
          icon="⚠️"
          title="Driver data could not be loaded"
          description="The admin workspace hit an error while loading drivers or ride performance context."
          action={
            <HeaderActionButton icon={FiRefreshCw} onClick={onRefresh}>
              Retry load
            </HeaderActionButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),360px]">
        <section className="rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,249,255,0.92),rgba(255,247,237,0.92))] p-6 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700">Driver Operations</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Drivers Management</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                A premium operations surface for approvals, live availability, vehicle readiness, and driver account intervention across KituiRides.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <HeaderActionButton icon={FiDownload} onClick={() => handleExport(filteredDrivers, "kituirides-drivers.csv")}>
                Export
              </HeaderActionButton>
              <HeaderActionButton icon={FiPlus} variant="primary" onClick={onAddDriver}>
                Add Driver
              </HeaderActionButton>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {summary.onlineDrivers} online now
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              {summary.pendingDrivers} awaiting approval
            </span>
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
              {driverEditRequestsCount} edit request ticket(s)
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {filteredDrivers.length} visible results
            </span>
          </div>
        </section>

        <aside className="rounded-[34px] border border-white/70 bg-white/92 p-6 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Ops Focus</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-amber-900">Verification queue</p>
                <FiAlertTriangle className="text-lg text-amber-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-amber-800">{summary.pendingDrivers}</p>
              <p className="mt-2 text-sm text-amber-900/80">Drivers waiting for admin approval or document review.</p>
            </div>

            <div className="rounded-[24px] border border-teal-200 bg-teal-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-teal-900">High performers</p>
                <FiStar className="text-lg text-teal-700" />
              </div>
              <p className="mt-3 text-3xl font-bold text-teal-800">{summary.topRatedDrivers}</p>
              <p className="mt-2 text-sm text-teal-900/80">Drivers currently rated 4.8 and above in the admin scoring model.</p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">Document readiness</p>
                <FiFileText className="text-lg text-slate-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {driverRecords.filter((driver) => driver.documentStats.label === "Complete").length}
              </p>
              <p className="mt-2 text-sm text-slate-600">Driver accounts with near-complete document coverage.</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard label="Total Drivers" value={summary.totalDrivers} helper="Registered fleet size" icon={FiUsers} tone="teal" />
        <SummaryCard label="Active Drivers" value={summary.activeDrivers} helper="Approved and enabled" icon={FiUserCheck} tone="emerald" />
        <SummaryCard label="Pending Verification" value={summary.pendingDrivers} helper="Needs approval" icon={FiShield} tone="amber" />
        <SummaryCard label="Suspended Drivers" value={summary.suspendedDrivers} helper="Locked accounts" icon={FiSlash} tone="rose" />
        <SummaryCard label="Offline Drivers" value={summary.offlineDrivers} helper="Approved but not online" icon={FiClock} tone="slate" />
        <SummaryCard label="Top Rated Drivers" value={summary.topRatedDrivers} helper="4.8 score and above" icon={FiStar} tone="violet" />
      </div>

      {analyticsWarning ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50/90 px-5 py-4 shadow-[0_18px_40px_-34px_rgba(146,64,14,0.35)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <FiAlertTriangle className="text-lg" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">Ride analytics are temporarily unavailable</p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  Driver accounts are still loaded, but performance cards and trip-derived insights may be incomplete.
                  {analyticsWarning ? ` ${analyticsWarning}` : ""}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {analyticsLoading ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
                  Retrying analytics
                </span>
              ) : null}
              <HeaderActionButton icon={FiRefreshCw} onClick={onRefresh}>
                Retry
              </HeaderActionButton>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[32px] border border-white/70 bg-white/92 p-5 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)] lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr),repeat(3,minmax(0,0.7fr))]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FiSearch className="text-sm" />
              Search
            </span>
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search driver name, phone, email, ID, or plate number"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              />
            </div>
          </label>

          <FilterSelect label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} icon={FiShield} />
          <FilterSelect label="Availability" value={availabilityFilter} options={AVAILABILITY_OPTIONS} onChange={setAvailabilityFilter} icon={FiActivity} />
          <FilterSelect label="Sort by" value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} icon={FiBarChart2} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[repeat(5,minmax(0,1fr)),auto]">
          <FilterSelect label="Verification" value={verificationFilter} options={VERIFICATION_OPTIONS} onChange={setVerificationFilter} icon={FiCheckCircle} />
          <FilterSelect label="Vehicle" value={vehicleFilter} options={VEHICLE_OPTIONS} onChange={setVehicleFilter} icon={FiTruck} />
          <FilterSelect label="Rating" value={ratingFilter} options={RATING_OPTIONS} onChange={setRatingFilter} icon={FiStar} />
          <FilterSelect label="Date range" value={dateRange} options={DATE_OPTIONS} onChange={setDateRange} icon={FiCalendar} />
          <div className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,rgba(15,118,110,0.06),rgba(255,255,255,0.96))] px-4 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FiFilter className="text-sm" />
              Filters
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{activeFilterCount}</p>
            <p className="mt-1 text-sm text-slate-500">active filter(s)</p>
          </div>
          <div className="flex items-end">
            <HeaderActionButton icon={FiRefreshCw} onClick={handleResetFilters} variant="ghost">
              Reset filters
            </HeaderActionButton>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-[0_24px_55px_-42px_rgba(15,23,42,0.65)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{selectedIds.length} driver(s) selected</p>
              <p className="mt-1 text-sm text-slate-300">Use batch actions for approvals and fleet access control.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <HeaderActionButton
                icon={FiCheckCircle}
                variant="secondary"
                onClick={() => handleBulkAction(true)}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? "Running..." : "Approve selected"}
              </HeaderActionButton>
              <HeaderActionButton
                icon={FiSlash}
                variant="secondary"
                onClick={() => handleBulkAction(false)}
                disabled={bulkActionLoading}
              >
                {bulkActionLoading ? "Running..." : "Suspend selected"}
              </HeaderActionButton>
              <HeaderActionButton
                icon={FiDownload}
                variant="secondary"
                onClick={() =>
                  handleExport(
                    driverRecords.filter((driver) => selectedIds.includes(driver.id)),
                    "kituirides-selected-drivers.csv"
                  )
                }
              >
                Export selected
              </HeaderActionButton>
              <HeaderActionButton icon={FiXCircle} variant="secondary" onClick={() => setSelectedIds([])}>
                Clear
              </HeaderActionButton>
            </div>
          </div>
          {bulkError ? <p className="mt-3 text-sm text-amber-300">{bulkError}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),360px]">
        <section className="rounded-[32px] border border-white/70 bg-white/92 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 lg:px-6">
            <div>
              <p className="text-lg font-semibold text-slate-950">Fleet roster</p>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredDrivers.length} driver result(s) across {totalPages} page(s)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAllVisible}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {allVisibleSelected ? "Clear visible selection" : "Select visible results"}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <FiRefreshCw className="text-base" />
                Refresh
              </button>
            </div>
          </div>

          {!filteredDrivers.length ? (
            <div className="px-5 py-10 lg:px-6">
              <EmptyState
                icon="🔎"
                title="No drivers match these filters"
                description="Adjust the search and filters to bring more driver records back into view."
                action={
                  <HeaderActionButton icon={FiRefreshCw} onClick={handleResetFilters}>
                    Reset filters
                  </HeaderActionButton>
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
                        <th className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={handleToggleAllVisible}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            aria-label="Select visible drivers"
                          />
                        </th>
                        <th className="px-4 py-4">Driver</th>
                        <th className="px-4 py-4">Vehicle</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Performance</th>
                        <th className="px-4 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDrivers.map((driver) => (
                        <DriverTableRow
                          key={driver.id}
                          driver={driver}
                          selected={previewDriver?.id === driver.id}
                          checked={selectedIds.includes(driver.id)}
                          onSelectRow={setPreviewDriverId}
                          onToggleChecked={handleToggleSelected}
                          onViewDetails={onViewDetails}
                          onEditDriver={onEditDriver}
                          onReviewDocuments={onViewDetails}
                          onToggleStatus={async (selectedDriver, approved) => {
                            await onApproveDriver(selectedDriver, approved);
                          }}
                          statusLoading={pendingApprovalDriverId === driver.id}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5 lg:hidden">
                {paginatedDrivers.map((driver) => (
                  <DriverMobileCard
                    key={driver.id}
                    driver={driver}
                    selected={previewDriver?.id === driver.id}
                    checked={selectedIds.includes(driver.id)}
                    onSelectRow={setPreviewDriverId}
                    onToggleChecked={handleToggleSelected}
                    onViewDetails={onViewDetails}
                    onEditDriver={onEditDriver}
                    onReviewDocuments={onViewDetails}
                    onToggleStatus={async (selectedDriver, approved) => {
                      await onApproveDriver(selectedDriver, approved);
                    }}
                    statusLoading={pendingApprovalDriverId === driver.id}
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
            driver={previewDriver}
            onViewDetails={onViewDetails}
            onEditDriver={onEditDriver}
            onReviewDocuments={onViewDetails}
            onViewRide={onViewRide}
            onPromptDelete={setDeleteCandidate}
            onToggleStatus={async (driver, approved) => {
              await onApproveDriver(driver, approved);
            }}
            statusLoading={pendingApprovalDriverId === previewDriver?.id}
            deleteLoading={pendingDeleteDriverId === previewDriver?.id}
          />

          <div className="rounded-[32px] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_-42px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Admin notes</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiTrendingUp className="text-base text-teal-600" />
                  Growth signal
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Prioritize newly verified drivers with complete documents so onboarding capacity turns into actual fleet availability quickly.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiLifeBuoy className="text-base text-orange-600" />
                  Support handoff
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {driverEditRequestsCount} driver edit ticket(s) are waiting. Review them alongside documents to keep compliance changes clean.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiGrid className="text-base text-sky-600" />
                  Workflow shape
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Use the roster for triage, the preview panel for quick judgment, and the full details modal when you need media or deeper driver data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(deleteCandidate)}
        title={deleteCandidate ? `Archive ${deleteCandidate.name}?` : "Archive driver"}
        onClose={() => setDeleteCandidate(null)}
        size="md"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <HeaderActionButton variant="ghost" onClick={() => setDeleteCandidate(null)}>
              Cancel
            </HeaderActionButton>
            <HeaderActionButton
              icon={FiXCircle}
              variant="primary"
              onClick={async () => {
                if (!deleteCandidate) {
                  return;
                }

                try {
                  await onDeleteDriver(deleteCandidate);
                  setDeleteCandidate(null);
                } catch {
                  return;
                }
              }}
              disabled={pendingDeleteDriverId === deleteCandidate?.id}
            >
              {pendingDeleteDriverId === deleteCandidate?.id ? "Archiving..." : "Archive driver"}
            </HeaderActionButton>
          </div>
        }
      >
        {deleteCandidate ? (
          <div className="space-y-4">
            <p className="text-sm leading-7 text-slate-600">
              This removes <span className="font-semibold text-slate-900">{deleteCandidate.name}</span> from the active fleet records and also clears related ride history from the admin system.
            </p>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Archive only when the account should no longer be available for operational recovery.
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
