/**
 * @fileoverview Page component for admin panel.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiMenu } from "react-icons/fi";
import AdminSidebar from "../components/AdminSidebar";
import DriversManagementWorkspace from "../components/DriversManagementWorkspace";
import AdminSettingsPanel from "../components/AdminSettingsPanel";
import RidersManagementWorkspace from "../components/RidersManagementWorkspace";
import { Avatar, Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal, StatCard } from "../components/UIComponents";
import { ADMIN_NAVIGATION_GROUPS, ADMIN_VIEW_META } from "../lib/adminNavigation";
import {
  approveDriver,
  createSupportAgent,
  deleteUser,
  getDashboard,
  getRides,
  getUsers,
  updateUserAccount,
  updateDriverDetails,
  upgradeUserToAdmin
} from "../features/admin/adminApi";
import { useAuth } from "../hooks/useAuth";
import { replyTicket, supportTickets, updateTicket } from "../features/support/supportApi";
import { rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

const SIDEBAR_STATE_KEY = "kituirides-admin-sidebar-collapsed";

const DRIVER_MEDIA_FIELDS = [
  { key: "profilePhotoUrl", label: "Passport Photo" },
  { key: "idFrontUrl", label: "National ID Front" },
  { key: "idBackUrl", label: "National ID Back" },
  { key: "licenseFrontUrl", label: "License Front" },
  { key: "licenseBackUrl", label: "License Back" },
  { key: "carFrontUrl", label: "Vehicle Front" },
  { key: "carRearUrl", label: "Vehicle Rear" },
  { key: "carInteriorUrl", label: "Vehicle Interior" },
  { key: "insurancePhotoUrl", label: "Insurance Sticker" },
  { key: "chassisPhotoUrl", label: "Chassis Number" }
];

const USER_WORKSPACE_CONFIG = {
  riders: {
    label: "Riders Management",
    defaultRole: "CUSTOMER",
    roleOptions: ["CUSTOMER"],
    allowSupportCreation: false,
    helperCopy: "Customer accounts are kept in a rider-specific workspace so support and driver approvals never compete for attention."
  },
  drivers: {
    label: "Drivers Management",
    defaultRole: "DRIVER",
    roleOptions: ["DRIVER"],
    allowSupportCreation: false,
    helperCopy: "Compliance review, approvals, vehicle inspection, and driver edits all live here."
  },
  staff: {
    label: "Admin Users / Staff Management",
    defaultRole: "ALL",
    roleOptions: ["ALL", "SUPPORT_AGENT", "ADMIN"],
    allowSupportCreation: true,
    helperCopy: "Manage trusted operational users, support agents, and admin promotion flow from one premium control surface."
  }
};

const TICKET_STATUS_FILTERS = [
  { key: "ACTIVE", label: "Open Queue" },
  { key: "OPEN", label: "Open" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "ALL", label: "All" }
];

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function resolveMediaUrl(path) {
  if (!path) return null;

  const trimmedPath = String(path).trim();
  if (!trimmedPath) return null;
  if (/^(?:https?:|data:|blob:)/i.test(trimmedPath)) return trimmedPath;

  const normalizedPath = trimmedPath.replace(/\\/g, "/");
  const uploadsPathMatch = normalizedPath.match(/(?:^|\/)(uploads\/.+)$/i);
  const browserPath = uploadsPathMatch
    ? `/${uploadsPathMatch[1].replace(/^\/+/, "")}`
    : normalizedPath.startsWith("/")
      ? normalizedPath
      : `/${normalizedPath}`;

  if (typeof window !== "undefined") {
    return new URL(browserPath, window.location.origin).toString();
  }

  const apiBase = import.meta.env.VITE_API_URL;
  if (apiBase?.startsWith("http")) {
    const backendOrigin = apiBase.replace(/\/api\/?$/, "");
    return new URL(browserPath, backendOrigin).toString();
  }

  return browserPath;
}

function isImageFile(path) {
  return /\.(png|jpe?g|gif|bmp|webp|svg|avif)(\?|#|$)/i.test(resolveMediaUrl(path) || "");
}

function getDriverMedia(user) {
  return DRIVER_MEDIA_FIELDS.map((field) => {
    const resolvedUrl = resolveMediaUrl(user?.[field.key]);
    return {
      ...field,
      url: user?.[field.key] || null,
      resolvedUrl,
      isImage: isImageFile(user?.[field.key])
    };
  });
}

function buildDriverEditForm(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    idNumber: user.idNumber || "",
    licenseNumber: user.licenseNumber || "",
    isOwner: user.isOwner ?? true,
    carMake: user.carMake || "",
    carModel: user.carModel || "",
    plateNumber: user.plateNumber || "",
    engineSize: user.engineSize || 1500,
    yearOfManufacture: user.yearOfManufacture || 2015,
    vehicleType: user.vehicleType || "CAR",
    profilePhotoUrl: user.profilePhotoUrl || "",
    carFrontUrl: user.carFrontUrl || "",
    carRearUrl: user.carRearUrl || "",
    carInteriorUrl: user.carInteriorUrl || "",
    insurancePhotoUrl: user.insurancePhotoUrl || "",
    chassisPhotoUrl: user.chassisPhotoUrl || ""
  };
}

function ticketStatusVariant(status) {
  if (status === "RESOLVED") return "success";
  if (status === "IN_PROGRESS") return "warning";
  return "info";
}

function getTicketTypeVariant(type) {
  if (type === "DISPUTE") return "warning";
  if (type === "PAYMENT_CONFLICT") return "orange";
  return "teal";
}

function renderWorkspacePlaceholder({ title, description, statCards, bodyTitle, bodyText, footerText }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label}>
            <StatCard label={card.label} value={card.value} icon={card.icon} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_60px_-40px_rgba(15,23,42,0.45)]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Workspace Shell</p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </div>
          <div className="mt-8 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/90 p-6">
            <p className="text-lg font-semibold text-slate-900">{bodyTitle}</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">{bodyText}</p>
          </div>
        </Card>

        <Card className="rounded-[28px] border border-white/70 bg-[linear-gradient(160deg,rgba(15,118,110,0.08),rgba(249,115,22,0.06),rgba(255,255,255,0.95))] shadow-[0_28px_60px_-40px_rgba(15,23,42,0.45)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Next Layer</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">Permission-ready structure</p>
              <p className="mt-2 text-sm text-slate-600">This navigation shell is already prepared for item-level permission filtering and future API-backed sections.</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
              <p className="text-sm font-semibold text-slate-900">Premium admin baseline</p>
              <p className="mt-2 text-sm text-slate-600">{footerText}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser, logout } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [userSearch, setUserSearch] = useState("");
  const [filterRole, setFilterRole] = useState("DRIVER");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("ACTIVE");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [replyByTicketId, setReplyByTicketId] = useState({});
  const [ticketNotesById, setTicketNotesById] = useState({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(SIDEBAR_STATE_KEY) === "true";
  });
  const emptySupportForm = {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: ""
  };
  const [supportForm, setSupportForm] = useState(emptySupportForm);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [editDriverForm, setEditDriverForm] = useState(null);

  const supportPasswordsMatch = supportForm.password === supportForm.confirmPassword;
  const supportPasswordValid = supportForm.password.trim().length >= 8;
  const supportFormComplete = [
    supportForm.firstName,
    supportForm.lastName,
    supportForm.email,
    supportForm.phoneNumber,
    supportForm.password,
    supportForm.confirmPassword
  ].every((value) => value.trim());

  const dashboardQuery = useQuery({ queryKey: ["admin-dashboard"], queryFn: getDashboard });
  const usersQuery = useQuery({ queryKey: ["admin-users"], queryFn: getUsers });
  const ridesQuery = useQuery({ queryKey: ["admin-rides"], queryFn: getRides });
  const ticketsQuery = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });

  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => approveDriver(id, approved),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      if (selectedUser?.id === variables.id) {
        setSelectedUser(null);
        setImagePreview(null);
      }
    }
  });

  const bulkDriverStatusMutation = useMutation({
    mutationFn: async ({ driverIds, approved }) => Promise.all(driverIds.map((driverId) => approveDriver(driverId, approved))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: upgradeUserToAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSelectedUser(null);
    }
  });

  const createSupportMutation = useMutation({
    mutationFn: createSupportAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSupportForm(emptySupportForm);
      setShowSupportModal(false);
    }
  });

  const updateUserAccountMutation = useMutation({
    mutationFn: ({ id, payload }) => updateUserAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: ({ id, payload }) => updateDriverDetails(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditDriverForm(null);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-rides"] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setSelectedUser(null);
      setImagePreview(null);
    }
  });

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }) => replyTicket(ticketId, { message }),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setReplyByTicketId((current) => ({ ...current, [ticketId]: "" }));
    }
  });

  const ticketStatusMutation = useMutation({
    mutationFn: ({ ticketId, status, resolutionNotes }) => updateTicket(ticketId, { status, resolutionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    }
  });

  const users = usersQuery.data || [];
  const rides = ridesQuery.data || [];
  const tickets = ticketsQuery.data || [];
  const customerUsers = useMemo(() => users.filter((user) => user.role === "CUSTOMER"), [users]);
  const driverUsers = useMemo(() => users.filter((user) => user.role === "DRIVER"), [users]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeView]);

  useEffect(() => {
    if (activeView === "riders") {
      setFilterRole("CUSTOMER");
    } else if (activeView === "drivers") {
      setFilterRole("DRIVER");
    } else if (activeView === "staff") {
      setFilterRole("ALL");
    }
  }, [activeView]);

  useEffect(() => {
    if (activeView === "supportTickets" || activeView === "disputes") {
      setTicketStatusFilter("ACTIVE");
    }
  }, [activeView]);

  useEffect(() => {
    if (!selectedUser || usersQuery.isLoading) {
      return;
    }

    const refreshedUser = users.find((user) => user.id === selectedUser.id);
    if (!refreshedUser) {
      setSelectedUser(null);
      return;
    }
    if (refreshedUser !== selectedUser) {
      setSelectedUser(refreshedUser);
    }
  }, [users, usersQuery.isLoading, selectedUser]);

  useEffect(() => {
    if (!selectedTicket || ticketsQuery.isLoading) {
      return;
    }

    const refreshedTicket = tickets.find((ticket) => ticket.id === selectedTicket.id);
    if (!refreshedTicket) {
      setSelectedTicket(null);
      return;
    }
    if (refreshedTicket !== selectedTicket) {
      setSelectedTicket(refreshedTicket);
    }
  }, [tickets, ticketsQuery.isLoading, selectedTicket]);

  const roleCounts = useMemo(() => {
    return users.reduce((counts, user) => {
      counts[user.role] = (counts[user.role] || 0) + 1;
      return counts;
    }, {});
  }, [users]);

  const pendingDrivers = useMemo(() => users.filter((user) => user.role === "DRIVER" && !user.verified), [users]);
  const openTickets = useMemo(() => tickets.filter((ticket) => ticket.status !== "RESOLVED"), [tickets]);
  const driverEditRequests = useMemo(() => tickets.filter((ticket) => ticket.ticketType === "DRIVER_EDIT_REQUEST"), [tickets]);
  const disputeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.ticketType === "DISPUTE" || ticket.ticketType === "PAYMENT_CONFLICT"),
    [tickets]
  );
  const selectedUserMedia = selectedUser?.role === "DRIVER" ? getDriverMedia(selectedUser) : [];
  const selectedTicketReply = selectedTicket ? (replyByTicketId[selectedTicket.id] || "") : "";
  const selectedTicketNotes = selectedTicket ? (ticketNotesById[selectedTicket.id] || "") : "";
  const pendingApprovalDriverId = approveMutation.isPending ? approveMutation.variables?.id : null;
  const pendingDeleteDriverId = deleteUserMutation.isPending ? deleteUserMutation.variables : null;
  const pendingUpdateUserId = updateUserAccountMutation.isPending ? updateUserAccountMutation.variables?.id : null;

  const paymentStats = useMemo(() => {
    return {
      pending: rides.filter((ride) => ride.paymentStatus !== "PAID" && ride.paymentStatus !== "COMPLETED").length,
      mpesa: rides.filter((ride) => ride.paymentType === "MPESA").length,
      cash: rides.filter((ride) => ride.paymentType === "CASH").length,
      completed: rides.filter((ride) => ride.paymentStatus === "PAID" || ride.paymentStatus === "COMPLETED").length
    };
  }, [rides]);

  const rideStats = useMemo(() => {
    return {
      total: rides.length,
      disputed: rides.filter((ride) => ride.status === "DISPUTED").length,
      completed: rides.filter((ride) => ride.status === "TRIP_COMPLETED").length,
      paymentPending: rides.filter((ride) => ride.status === "PAYMENT_PENDING").length
    };
  }, [rides]);

  const sidebarBadges = useMemo(() => ({
    dashboard: dashboardQuery.data?.activeRideRequests ? String(dashboardQuery.data.activeRideRequests) : null,
    drivers: pendingDrivers.length ? String(pendingDrivers.length) : null,
    supportTickets: openTickets.length ? String(openTickets.length) : null,
    disputes: disputeTickets.length ? String(disputeTickets.length) : null,
    payments: paymentStats.pending ? String(paymentStats.pending) : null,
    mpesa: paymentStats.mpesa ? String(paymentStats.mpesa) : null,
    staff: ((roleCounts.SUPPORT_AGENT || 0) + (roleCounts.ADMIN || 0)) ? String((roleCounts.SUPPORT_AGENT || 0) + (roleCounts.ADMIN || 0)) : null,
    auditLogs: "Soon"
  }), [
    dashboardQuery.data?.activeRideRequests,
    disputeTickets.length,
    openTickets.length,
    paymentStats.mpesa,
    paymentStats.pending,
    pendingDrivers.length,
    roleCounts.ADMIN,
    roleCounts.SUPPORT_AGENT
  ]);

  const activeSection = ADMIN_VIEW_META[activeView] || ADMIN_VIEW_META.dashboard;

  const resetSupportForm = () => {
    setSupportForm(emptySupportForm);
    createSupportMutation.reset();
  };

  const closeSelectedUser = () => {
    setSelectedUser(null);
    setImagePreview(null);
    deleteUserMutation.reset();
  };

  const handleDeleteUser = (user) => {
    const confirmed = window.confirm(
      `Delete ${user.firstName} ${user.lastName}? This permanently removes the user and any related ride history from the system.`
    );
    if (!confirmed) {
      return;
    }
    deleteUserMutation.mutate(user.id);
  };

  const handleSidebarSelect = (item) => {
    if (item.kind === "action" && item.id === "logout") {
      logout();
      navigate("/login");
      return;
    }
    setActiveView(item.id);
  };

  const openDriverEditForm = (user) => {
    setEditDriverForm(buildDriverEditForm(user));
  };

  const renderDriversWorkspace = () => {
    return (
      <DriversManagementWorkspace
        drivers={driverUsers}
        rides={rides}
        driverEditRequestsCount={driverEditRequests.length}
        loading={usersQuery.isLoading}
        error={usersQuery.error}
        analyticsLoading={ridesQuery.isLoading}
        analyticsWarning={ridesQuery.error?.response?.data?.message || (ridesQuery.error ? "Ride metrics could not be refreshed right now." : "")}
        onRefresh={() => {
          usersQuery.refetch();
          ridesQuery.refetch();
        }}
        onAddDriver={() => {
          if (typeof window !== "undefined") {
            window.open("/register", "_blank", "noopener,noreferrer");
          }
        }}
        onViewDetails={setSelectedUser}
        onEditDriver={openDriverEditForm}
        onApproveDriver={(driver, approved) => approveMutation.mutateAsync({ id: driver.id, approved })}
        onBulkStatusChange={(payload) => bulkDriverStatusMutation.mutateAsync(payload)}
        onDeleteDriver={(driver) => deleteUserMutation.mutateAsync(driver.id)}
        onViewRide={setSelectedRide}
        pendingApprovalDriverId={pendingApprovalDriverId}
        pendingDeleteDriverId={pendingDeleteDriverId}
        bulkActionLoading={bulkDriverStatusMutation.isPending}
      />
    );
  };

  const renderRidersWorkspace = () => {
    const insightsWarnings = [
      ridesQuery.error?.response?.data?.message || (ridesQuery.error ? "Ride history metrics are unavailable right now." : ""),
      ticketsQuery.error?.response?.data?.message || (ticketsQuery.error ? "Support issue indicators are unavailable right now." : "")
    ].filter(Boolean);

    return (
      <RidersManagementWorkspace
        riders={customerUsers}
        rides={rides}
        tickets={tickets}
        loading={usersQuery.isLoading}
        error={usersQuery.error}
        insightsLoading={ridesQuery.isLoading || ticketsQuery.isLoading}
        insightsWarning={insightsWarnings.join(" ")}
        onRefresh={() => {
          usersQuery.refetch();
          ridesQuery.refetch();
          ticketsQuery.refetch();
        }}
        onViewDetails={setSelectedUser}
        onViewRide={setSelectedRide}
        onViewTicket={setSelectedTicket}
        onUpdateRider={(rider, changes) =>
          updateUserAccountMutation.mutateAsync({
            id: rider.id,
            payload: {
              firstName: changes.firstName ?? rider.firstName,
              lastName: changes.lastName ?? rider.lastName,
              email: String(changes.email ?? rider.email ?? "").trim(),
              phoneNumber: String(changes.phoneNumber ?? rider.phoneNumber ?? "").trim(),
              active: changes.active ?? (rider.active !== false)
            }
          })
        }
        onArchiveRider={(rider) => deleteUserMutation.mutateAsync(rider.id)}
        pendingUpdateRiderId={pendingUpdateUserId}
        pendingDeleteRiderId={pendingDeleteDriverId}
      />
    );
  };

  const renderDashboardView = () => {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total Users" value={dashboardQuery.data?.totalUsers ?? 0} icon="👥" />
          <StatCard label="Total Rides" value={dashboardQuery.data?.totalRides ?? 0} icon="🚕" />
          <StatCard label="Active Requests" value={dashboardQuery.data?.activeRideRequests ?? 0} icon="📡" />
          <StatCard label="Pending Drivers" value={pendingDrivers.length} icon="🪪" />
          <StatCard label="Open Tickets" value={openTickets.length} icon="🎫" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <Card className="rounded-[30px] border border-white/70 bg-white/95 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Command Overview</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Today’s Operational Picture</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                The admin home stays intentionally summary-first. Use the premium sidebar to move into the exact workspace you need without flooding the first screen with rows and controls.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {ADMIN_NAVIGATION_GROUPS.filter((group) => group.id !== "session").slice(0, 4).map((group) => (
                <div key={group.id} className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{group.label}</p>
                  <div className="mt-4 space-y-3">
                    {group.items.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        {sidebarBadges[item.id] ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {sidebarBadges[item.id]}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Ready</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[30px] border border-white/70 bg-[linear-gradient(160deg,rgba(15,118,110,0.1),rgba(249,115,22,0.08),rgba(255,255,255,0.96))] shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Priority Queues</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[24px] border border-amber-200 bg-white/90 p-5">
                <p className="text-sm font-semibold text-amber-900">Driver approvals waiting</p>
                <p className="mt-3 text-3xl font-bold text-amber-700">{pendingDrivers.length}</p>
                <p className="mt-2 text-sm text-amber-900/80">Go to `Drivers Management` when it is time to verify new applicants.</p>
              </div>
              <div className="rounded-[24px] border border-blue-200 bg-white/90 p-5">
                <p className="text-sm font-semibold text-blue-900">Open support queue</p>
                <p className="mt-3 text-3xl font-bold text-blue-700">{openTickets.length}</p>
                <p className="mt-2 text-sm text-blue-900/80">Use `Support Tickets` or `Disputes / Issue Resolution` for active intervention.</p>
              </div>
              <div className="rounded-[24px] border border-teal-200 bg-white/90 p-5">
                <p className="text-sm font-semibold text-teal-900">Payment follow-ups</p>
                <p className="mt-3 text-3xl font-bold text-teal-700">{paymentStats.pending}</p>
                <p className="mt-2 text-sm text-teal-900/80">`Payments` and `Mpesa Transactions` are kept separate for clean finance workflows.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderUserWorkspace = (workspaceId) => {
    const config = USER_WORKSPACE_CONFIG[workspaceId];
    const allowedRoles = config.roleOptions.includes("ALL")
      ? ["SUPPORT_AGENT", "ADMIN"]
      : config.roleOptions;
    const activeRoleFilter = config.roleOptions.includes(filterRole) ? filterRole : config.defaultRole;
    const query = userSearch.trim().toLowerCase();

    const visibleUsers = users.filter((user) => {
      const belongsToWorkspace = allowedRoles.includes(user.role);
      const matchesRole = activeRoleFilter === "ALL" ? true : user.role === activeRoleFilter;
      const matchesQuery = !query || [
        user.firstName,
        user.lastName,
        user.email,
        user.phoneNumber,
        user.plateNumber
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));

      return belongsToWorkspace && matchesRole && matchesQuery;
    });

    return (
      <div className="space-y-6">
        <Card className="rounded-[30px] border border-white/70 bg-white/95 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">{config.label}</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Focused account management</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{config.helperCopy}</p>
            </div>
            {config.allowSupportCreation && (
              <Button variant="orange" onClick={() => setShowSupportModal(true)}>
                Add Support Agent
              </Button>
            )}
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr),auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Search People</label>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name, email, phone, or plate number"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-100"
              />
            </div>
            <div className="flex flex-wrap gap-2 self-end">
              {config.roleOptions.map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant={activeRoleFilter === role ? "primary" : "secondary"}
                  onClick={() => setFilterRole(role)}
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {allowedRoles.map((role) => (
              <div key={role} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {role}: {roleCounts[role] || 0}
              </div>
            ))}
            <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              Showing {visibleUsers.length} of {users.filter((user) => allowedRoles.includes(user.role)).length}
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="mt-8">
              <LoadingSpinner />
            </div>
          ) : !visibleUsers.length ? (
            <div className="mt-8">
              <EmptyState icon="👤" title="No users found" description="Broaden the search or switch the role scope to see more records." />
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {visibleUsers.map((user) => (
                <div key={user.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${user.firstName} ${user.lastName}`} size="md" />
                      <div>
                        <p className="font-semibold text-slate-950">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-slate-600">{user.email} • {user.phoneNumber}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={user.role} variant="teal" size="sm" />
                      {user.role === "DRIVER" && (
                        <Badge label={user.verified ? "Verified" : "Unverified"} variant={user.verified ? "success" : "warning"} size="sm" />
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setSelectedUser(user)}>
                        View
                      </Button>
                      {user.role === "DRIVER" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openDriverEditForm(user)}
                        >
                          Edit
                        </Button>
                      )}
                      {user.role === "DRIVER" && !user.verified && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: user.id, approved: true })}
                            loading={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => approveMutation.mutate({ id: user.id, approved: false })}
                            loading={approveMutation.isPending}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {user.role === "DRIVER" && user.verified && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => approveMutation.mutate({ id: user.id, approved: false })}
                          loading={approveMutation.isPending}
                        >
                          Unverify
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderTicketWorkspace = (workspaceId) => {
    const query = ticketSearch.trim().toLowerCase();
    const relevantTickets = tickets.filter((ticket) => {
      if (workspaceId === "disputes") {
        return ticket.ticketType === "DISPUTE" || ticket.ticketType === "PAYMENT_CONFLICT";
      }
      return true;
    });

    const visibleTickets = relevantTickets.filter((ticket) => {
      const matchesStatus = ticketStatusFilter === "ALL"
        ? true
        : ticketStatusFilter === "ACTIVE"
          ? ticket.status !== "RESOLVED"
          : ticket.status === ticketStatusFilter;

      const matchesQuery = !query || [
        ticket.subject,
        ticket.description,
        ticket.ticketType,
        ticket.status,
        String(ticket.id),
        ticket.rideId ? String(ticket.rideId) : ""
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));

      return matchesStatus && matchesQuery;
    });

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Visible Tickets" value={visibleTickets.length} icon="🎫" />
          <StatCard label="Open Queue" value={visibleTickets.filter((ticket) => ticket.status !== "RESOLVED").length} icon="📬" />
          <StatCard label="In Progress" value={visibleTickets.filter((ticket) => ticket.status === "IN_PROGRESS").length} icon="🛠" />
          <StatCard label="Resolved" value={visibleTickets.filter((ticket) => ticket.status === "RESOLVED").length} icon="✅" />
        </div>

        <Card className="rounded-[30px] border border-white/70 bg-white/95 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
                {workspaceId === "disputes" ? "Dispute Resolution" : "Support Queue"}
              </p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">
                {workspaceId === "disputes" ? "Issue resolution workspace" : "Ticket response workspace"}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {workspaceId === "disputes"
                  ? "Keep payment conflicts and dispute tickets isolated so high-attention issues are easier to triage."
                  : "Review, reply to, and move the broader support queue without leaving the admin dashboard."}
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Showing {visibleTickets.length} of {relevantTickets.length}
            </div>
          </div>

          <div className="mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr),auto]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Search Tickets</label>
              <input
                value={ticketSearch}
                onChange={(event) => setTicketSearch(event.target.value)}
                placeholder="Search by subject, ride ID, ticket type, or status"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-100"
              />
            </div>
            <div className="flex flex-wrap gap-2 self-end">
              {TICKET_STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.key}
                  size="sm"
                  variant={ticketStatusFilter === filter.key ? "primary" : "secondary"}
                  onClick={() => setTicketStatusFilter(filter.key)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {ticketsQuery.isLoading ? (
            <div className="mt-8">
              <LoadingSpinner />
            </div>
          ) : !visibleTickets.length ? (
            <div className="mt-8">
              <EmptyState icon="📭" title="No tickets match" description="Broaden the filter or search text to widen the queue." />
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {visibleTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  className="w-full rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white hover:shadow-[0_24px_45px_-36px_rgba(15,23,42,0.45)]"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">#{ticket.id} • {ticket.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
                    </div>
                    <Badge label={ticket.status} variant={ticketStatusVariant(ticket.status)} size="sm" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge label={ticket.ticketType} variant={getTicketTypeVariant(ticket.ticketType)} size="sm" />
                    {ticket.rideId && <Badge label={`Ride ${ticket.rideId}`} variant="orange" size="sm" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderTripsWorkspace = (workspaceId) => {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Tracked Trips" value={rideStats.total} icon="🛣" />
          <StatCard label="Disputed" value={rideStats.disputed} icon="⚠" />
          <StatCard label="Payment Pending" value={rideStats.paymentPending} icon="💳" />
          <StatCard label="Completed" value={rideStats.completed} icon="✅" />
        </div>

        <Card className="rounded-[30px] border border-white/70 bg-white/95 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
              {workspaceId === "bookings" ? "Booking Stream" : "Trip Stream"}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              {workspaceId === "bookings" ? "Recent customer bookings" : "Recent trip operations"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {workspaceId === "bookings"
                ? "Monitor the booking feed in a booking-specific surface while still reusing the underlying trip data."
                : "Inspect active trip activity, payment flow, and ride outcomes from a clean operations workspace."}
            </p>
          </div>

          {ridesQuery.isLoading ? (
            <div className="mt-8">
              <LoadingSpinner />
            </div>
          ) : !rides.length ? (
            <div className="mt-8">
              <EmptyState icon="🚗" title="No rides found" description="Trips will appear here once customers start requesting rides." />
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {rides.slice(0, 12).map((ride) => (
                <div key={ride.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{ride.pickupAddress} to {ride.dropoffAddress}</p>
                      <p className="text-sm text-slate-600">{formatMoney(ride.finalFare)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={rideStatusLabel(ride.status)} variant={rideStatusVariant(ride.status)} size="sm" />
                      <Button variant="secondary" size="sm" onClick={() => setSelectedRide(ride)}>
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderPaymentsWorkspace = (workspaceId) => {
    const paymentRows = rides.filter((ride) => {
      if (workspaceId === "mpesa") {
        return ride.paymentType === "MPESA";
      }
      return Boolean(ride.paymentType);
    });

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Pending Review" value={paymentStats.pending} icon="💸" />
          <StatCard label="M-Pesa Trips" value={paymentStats.mpesa} icon="📱" />
          <StatCard label="Cash Trips" value={paymentStats.cash} icon="💵" />
          <StatCard label="Completed Payments" value={paymentStats.completed} icon="🏁" />
        </div>

        <Card className="rounded-[30px] border border-white/70 bg-white/95 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">
              {workspaceId === "mpesa" ? "Mobile Money" : "Payments Desk"}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-slate-950">
              {workspaceId === "mpesa" ? "M-Pesa transaction surface" : "Payment operations"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {workspaceId === "mpesa"
                ? "This workspace is ready for deeper M-Pesa reconciliation while still surfacing the current trip-linked mobile money flow."
                : "Track trip-linked payment state, pending follow-up items, and the current mix between payment methods."}
            </p>
          </div>

          {!paymentRows.length ? (
            <div className="mt-8">
              <EmptyState
                icon={workspaceId === "mpesa" ? "📱" : "💳"}
                title={workspaceId === "mpesa" ? "No M-Pesa transactions yet" : "No payment records yet"}
                description="As trips move through payment, they will surface here automatically."
              />
            </div>
          ) : (
            <div className="mt-8 space-y-3">
              {paymentRows.slice(0, 10).map((ride) => (
                <div key={ride.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">Ride #{ride.id}</p>
                      <p className="text-sm text-slate-600">{ride.pickupAddress} to {ride.dropoffAddress}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={ride.paymentType || "UNKNOWN"} variant="teal" size="sm" />
                      <Badge label={ride.paymentStatus || "PENDING"} variant={ride.paymentStatus === "PAID" || ride.paymentStatus === "COMPLETED" ? "success" : "warning"} size="sm" />
                      <span className="text-sm font-semibold text-slate-700">{formatMoney(ride.finalFare)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderReportsWorkspace = () => {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Customers" value={roleCounts.CUSTOMER || 0} icon="🧍" />
          <StatCard label="Drivers" value={roleCounts.DRIVER || 0} icon="🚘" />
          <StatCard label="Support / Admin" value={(roleCounts.SUPPORT_AGENT || 0) + (roleCounts.ADMIN || 0)} icon="🧠" />
          <StatCard label="Resolved Tickets" value={tickets.filter((ticket) => ticket.status === "RESOLVED").length} icon="📊" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <Card className="rounded-[30px] border border-white/70 bg-white/95 shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">Operator Insights</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                <p className="text-sm font-semibold text-slate-900">Approval pressure</p>
                <p className="mt-2 text-sm text-slate-600">
                  {pendingDrivers.length} drivers are waiting for approval, which is the strongest indicator of current onboarding pressure.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                <p className="text-sm font-semibold text-slate-900">Support queue temperature</p>
                <p className="mt-2 text-sm text-slate-600">
                  {openTickets.length} tickets remain open, with {disputeTickets.length} needing higher-attention issue resolution.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5">
                <p className="text-sm font-semibold text-slate-900">Revenue mix snapshot</p>
                <p className="mt-2 text-sm text-slate-600">
                  M-Pesa currently covers {paymentStats.mpesa} trip(s), while cash covers {paymentStats.cash} trip(s).
                </p>
              </div>
            </div>
          </Card>

          <Card className="rounded-[30px] border border-white/70 bg-[linear-gradient(160deg,rgba(15,118,110,0.09),rgba(249,115,22,0.06),rgba(255,255,255,0.95))] shadow-[0_32px_70px_-46px_rgba(15,23,42,0.5)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Scaling Note</p>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Future chart slots</p>
                <p className="mt-2 text-sm text-slate-600">This workspace is ready for richer analytics once dedicated admin reporting endpoints land.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Permission-ready sections</p>
                <p className="mt-2 text-sm text-slate-600">The new sidebar structure can be filtered later per-role or per-capability without a redesign.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return renderDashboardView();
      case "riders":
        return renderRidersWorkspace();
      case "staff":
        return renderUserWorkspace(activeView);
      case "drivers":
        return renderDriversWorkspace();
      case "supportTickets":
      case "disputes":
        return renderTicketWorkspace(activeView);
      case "trips":
      case "bookings":
        return renderTripsWorkspace(activeView);
      case "payments":
      case "mpesa":
        return renderPaymentsWorkspace(activeView);
      case "reports":
        return renderReportsWorkspace();
      case "settings":
        return <AdminSettingsPanel activeRequestsCount={dashboardQuery.data?.activeRideRequests ?? 0} />;
      case "promotions":
        return renderWorkspacePlaceholder({
          title: "Promotions / Coupons",
          description: "The premium navigation now includes a clean growth workspace so promotions can land later without another information architecture change.",
          statCards: [
            { label: "Potential Campaigns", value: 0, icon: "🎁" },
            { label: "Coupon Rules", value: 0, icon: "🏷" },
            { label: "Driver Boosts", value: 0, icon: "🚀" },
            { label: "Activation Status", value: "Ready", icon: "✨" }
          ],
          bodyTitle: "Growth tooling shell",
          bodyText: "Connect future coupon, reward, and demand-shaping APIs here. The sidebar and workspace hierarchy are already production-ready for that next layer.",
          footerText: "The structure is polished enough to absorb campaign management later without layout churn."
        });
      case "notifications":
        return renderWorkspacePlaceholder({
          title: "Notifications",
          description: "Operational alerts and outbound messaging deserve a dedicated, trusted workspace instead of being hidden inside general settings.",
          statCards: [
            { label: "Unread Alerts", value: 0, icon: "🔔" },
            { label: "Broadcasts", value: 0, icon: "📣" },
            { label: "Audience Segments", value: 0, icon: "🧭" },
            { label: "Status", value: "Ready", icon: "✅" }
          ],
          bodyTitle: "Notification center shell",
          bodyText: "The premium sidebar is now prepared for future internal alerts, admin broadcasts, and lifecycle messaging tools.",
          footerText: "This avoids coupling communication tooling to unrelated settings screens later."
        });
      case "auditLogs":
        return renderWorkspacePlaceholder({
          title: "Audit Logs",
          description: "Admin traceability deserves first-class space in the navigation, even before the underlying event stream is fully exposed.",
          statCards: [
            { label: "Tracked Actions", value: "Soon", icon: "🧾" },
            { label: "Compliance Views", value: "Ready", icon: "🛡" },
            { label: "Staff Activity", value: (roleCounts.SUPPORT_AGENT || 0) + (roleCounts.ADMIN || 0), icon: "👥" },
            { label: "Visibility", value: "Scoped", icon: "🔍" }
          ],
          bodyTitle: "Compliance-ready shell",
          bodyText: "Hook admin event history, configuration changes, and privileged actions into this workspace once backend audit endpoints are exposed.",
          footerText: "This gives the admin IA a trustworthy compliance lane from the start."
        });
      default:
        return renderDashboardView();
    }
  };

  const adminProfile = {
    name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Admin User",
    email: currentUser?.email || "admin@kituirides.com",
    role: currentUser?.role || "ADMIN"
  };

  return (
    <div
      className="relative min-h-[calc(100vh-81px)] overflow-hidden bg-[linear-gradient(180deg,#f8fafc,#eef4f7)] px-4 py-4 lg:pr-6 lg:pt-6 lg:pl-[var(--admin-sidebar-offset)]"
      style={{ "--admin-sidebar-offset": `${sidebarCollapsed ? 136 : 344}px` }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute bottom-12 left-1/3 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <AdminSidebar
        groups={ADMIN_NAVIGATION_GROUPS}
        activeItem={activeView}
        badgesById={sidebarBadges}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onSelect={handleSidebarSelect}
        profile={adminProfile}
      />

      <div className="relative z-10 space-y-6">
        <div className="rounded-[32px] border border-white/70 bg-white/80 px-5 py-5 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.5)] backdrop-blur-xl lg:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 lg:hidden"
                aria-label="Open admin navigation"
              >
                <FiMenu className="text-xl" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700">{activeSection.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{activeSection.title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{activeSection.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Admin Workspace
              </span>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                {dashboardQuery.data?.activeRideRequests ?? 0} active requests
              </span>
            </div>
          </div>
        </div>

        {renderContent()}
      </div>

      {selectedUser && (
        <Modal isOpen={Boolean(selectedUser)} title={`User Details • ${selectedUser.firstName} ${selectedUser.lastName}`} onClose={closeSelectedUser} size="2xl">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-semibold text-slate-900">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-semibold text-slate-900">{selectedUser.phoneNumber}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge label={selectedUser.role} variant="teal" size="sm" />
              <Badge label={selectedUser.active === false ? "Suspended" : "Active"} variant={selectedUser.active === false ? "warning" : "success"} size="sm" />
              {selectedUser.role === "DRIVER" && (
                <Badge label={selectedUser.verified ? "Verified" : "Unverified"} variant={selectedUser.verified ? "success" : "warning"} size="sm" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedUser.role === "DRIVER" && (
                <Button
                  size="sm"
                  variant={selectedUser.verified ? "secondary" : "primary"}
                  onClick={() => approveMutation.mutate({ id: selectedUser.id, approved: !selectedUser.verified })}
                  loading={approveMutation.isPending}
                >
                  {selectedUser.verified ? "Unverify & Lock Driver" : "Approve Driver"}
                </Button>
              )}
              {selectedUser.role === "SUPPORT_AGENT" && (
                <Button size="sm" onClick={() => upgradeMutation.mutate(selectedUser.id)} loading={upgradeMutation.isPending}>
                  Promote to Admin
                </Button>
              )}
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDeleteUser(selectedUser)}
                loading={deleteUserMutation.isPending}
                disabled={currentUser?.id === selectedUser.id}
              >
                Delete User
              </Button>
            </div>

            {currentUser?.id === selectedUser.id && (
              <p className="text-sm text-slate-500">Your own admin account cannot be deleted while you are signed in.</p>
            )}

            {deleteUserMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteUserMutation.error?.response?.data?.message || "Failed to delete user."}
              </div>
            )}

            {selectedUser.role === "DRIVER" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">ID Number</p>
                    <p className="font-semibold text-slate-900">{selectedUser.idNumber}</p>
                    <p className="mt-3 text-sm text-slate-500">License Number</p>
                    <p className="font-semibold text-slate-900">{selectedUser.licenseNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Vehicle</p>
                    <p className="font-semibold text-slate-900">{selectedUser.carMake} {selectedUser.carModel}</p>
                    <p className="mt-1 text-sm text-slate-600">{selectedUser.plateNumber} • {selectedUser.engineSize}cc • {selectedUser.vehicleType}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Verification Images</h3>
                    <p className="text-sm text-slate-500">Click any uploaded file to preview it on the site or download the original copy.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {selectedUserMedia.map((media) => (
                      <div key={media.key} className="rounded-2xl border border-slate-200 p-4">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {media.url ? (
                            <button
                              type="button"
                              className="flex aspect-[4/3] w-full items-center justify-center bg-slate-100"
                              onClick={() => setImagePreview(media)}
                            >
                              {media.isImage ? (
                                <img src={media.resolvedUrl} alt={media.label} className="h-full w-full object-cover" />
                              ) : (
                                <div className="px-4 text-center text-sm font-medium text-slate-600">File uploaded. Click to preview.</div>
                              )}
                            </button>
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center px-4 text-center text-sm text-slate-500">
                              Not uploaded yet
                            </div>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{media.label}</p>
                            <p className="text-sm text-slate-500">{media.url ? "Available for review" : "Missing"}</p>
                          </div>
                          {media.url && (
                            <div className="flex gap-2">
                              <Button type="button" variant="secondary" size="sm" onClick={() => setImagePreview(media)}>
                                View
                              </Button>
                              <a
                                href={media.resolvedUrl}
                                download
                                className="inline-flex items-center justify-center rounded-lg border-2 border-teal-600 px-3 py-1 text-sm font-semibold text-teal-600 transition hover:bg-teal-50"
                              >
                                Download
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          title={`Ticket #${selectedTicket.id}`}
          onClose={() => setSelectedTicket(null)}
          size="lg"
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              {selectedTicket.status === "OPEN" && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    ticketStatusMutation.mutate({
                      ticketId: selectedTicket.id,
                      status: "IN_PROGRESS",
                      resolutionNotes: selectedTicketNotes
                    })
                  }
                  loading={ticketStatusMutation.isPending}
                >
                  Mark In Progress
                </Button>
              )}
              <Button
                onClick={() =>
                  ticketStatusMutation.mutate({
                    ticketId: selectedTicket.id,
                    status: "RESOLVED",
                    resolutionNotes: selectedTicketNotes
                  })
                }
                loading={ticketStatusMutation.isPending}
              >
                Mark Resolved
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{selectedTicket.subject}</p>
                  <p className="text-sm text-slate-600">{selectedTicket.description}</p>
                </div>
                <Badge label={selectedTicket.ticketType} variant={getTicketTypeVariant(selectedTicket.ticketType)} size="sm" />
              </div>
            </div>

            {selectedTicket.rideId && (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
                Linked ride: #{selectedTicket.rideId}. Use `Trips Management` if you need to inspect the trip itself.
              </div>
            )}

            {!!selectedTicket.replies?.length ? (
              <div className="space-y-3">
                {selectedTicket.replies.map((reply) => (
                  <div key={reply.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">User #{reply.authorUserId}</p>
                    <p className="mt-1 text-slate-600">{reply.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No replies on this ticket yet.</p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reply</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                rows={4}
                value={selectedTicketReply}
                onChange={(event) =>
                  setReplyByTicketId((current) => ({
                    ...current,
                    [selectedTicket.id]: event.target.value
                  }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Resolution Notes</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                rows={3}
                value={selectedTicketNotes}
                onChange={(event) =>
                  setTicketNotesById((current) => ({
                    ...current,
                    [selectedTicket.id]: event.target.value
                  }))
                }
              />
            </div>

            <Button
              className="w-full"
              variant="secondary"
              onClick={() => replyMutation.mutate({ ticketId: selectedTicket.id, message: selectedTicketReply })}
              loading={replyMutation.isPending}
              disabled={!selectedTicketReply.trim()}
            >
              Send Reply
            </Button>
          </div>
        </Modal>
      )}

      {selectedRide && (
        <Modal isOpen={Boolean(selectedRide)} title={`Ride #${selectedRide.id}`} onClose={() => setSelectedRide(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <Badge label={rideStatusLabel(selectedRide.status)} variant={rideStatusVariant(selectedRide.status)} size="sm" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Pickup</p>
                <p className="font-semibold text-slate-900">{selectedRide.pickupAddress}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Dropoff</p>
                <p className="font-semibold text-slate-900">{selectedRide.dropoffAddress}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Fare</p>
                <p className="font-semibold text-slate-900">{formatMoney(selectedRide.finalFare)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <p className="font-semibold text-slate-900">{selectedRide.paymentType} • {selectedRide.paymentStatus}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {imagePreview && (
        <Modal isOpen={Boolean(imagePreview)} title={imagePreview.label} onClose={() => setImagePreview(null)} size="2xl">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {imagePreview.isImage ? (
                <img
                  src={imagePreview.resolvedUrl}
                  alt={imagePreview.label}
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <iframe
                  title={imagePreview.label}
                  src={imagePreview.resolvedUrl}
                  className="h-[70vh] w-full"
                />
              )}
            </div>
            <div className="flex justify-end">
              <a
                href={imagePreview.resolvedUrl}
                download
                className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Download File
              </a>
            </div>
          </div>
        </Modal>
      )}

      {showSupportModal && (
        <Modal
          isOpen={showSupportModal}
          title="Create Support Agent"
          onClose={() => {
            setShowSupportModal(false);
            resetSupportForm();
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!supportFormComplete || !supportPasswordsMatch || !supportPasswordValid) {
                return;
              }
              createSupportMutation.mutate({
                firstName: supportForm.firstName.trim(),
                lastName: supportForm.lastName.trim(),
                email: supportForm.email.trim(),
                phoneNumber: supportForm.phoneNumber.trim(),
                password: supportForm.password
              });
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="First Name" value={supportForm.firstName} onChange={(event) => setSupportForm((current) => ({ ...current, firstName: event.target.value }))} required />
              <Input label="Last Name" value={supportForm.lastName} onChange={(event) => setSupportForm((current) => ({ ...current, lastName: event.target.value }))} required />
            </div>
            <Input label="Email" type="email" value={supportForm.email} onChange={(event) => setSupportForm((current) => ({ ...current, email: event.target.value }))} required />
            <Input label="Phone Number" value={supportForm.phoneNumber} onChange={(event) => setSupportForm((current) => ({ ...current, phoneNumber: event.target.value }))} required />
            <Input label="Password" type="password" value={supportForm.password} onChange={(event) => setSupportForm((current) => ({ ...current, password: event.target.value }))} required />
            <Input label="Confirm Password" type="password" value={supportForm.confirmPassword} onChange={(event) => setSupportForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
            {!supportPasswordValid && supportForm.password.length > 0 && (
              <p className="text-sm text-red-600">Password must be at least 8 characters long.</p>
            )}
            {!supportPasswordsMatch && supportForm.confirmPassword.length > 0 && (
              <p className="text-sm text-red-600">Passwords do not match.</p>
            )}
            {createSupportMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createSupportMutation.error?.response?.data?.message || "Failed to create support agent."}
              </div>
            )}
            <p className="text-sm text-slate-500">
              Set an initial password here so the support agent can log in immediately after creation.
            </p>
            <Button
              type="submit"
              className="w-full"
              loading={createSupportMutation.isPending}
              disabled={!supportFormComplete || !supportPasswordValid || !supportPasswordsMatch}
            >
              Create Support Agent
            </Button>
          </form>
        </Modal>
      )}

      {editDriverForm && (
        <Modal isOpen={Boolean(editDriverForm)} title="Edit Driver Details" onClose={() => setEditDriverForm(null)} size="lg">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              updateDriverMutation.mutate({ id: editDriverForm.id, payload: editDriverForm });
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="First Name" value={editDriverForm.firstName} onChange={(event) => setEditDriverForm((current) => ({ ...current, firstName: event.target.value }))} required />
              <Input label="Last Name" value={editDriverForm.lastName} onChange={(event) => setEditDriverForm((current) => ({ ...current, lastName: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Email" value={editDriverForm.email} onChange={(event) => setEditDriverForm((current) => ({ ...current, email: event.target.value }))} required />
              <Input label="Phone Number" value={editDriverForm.phoneNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, phoneNumber: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="ID Number" value={editDriverForm.idNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, idNumber: event.target.value }))} required />
              <Input label="License Number" value={editDriverForm.licenseNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, licenseNumber: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Vehicle Make" value={editDriverForm.carMake} onChange={(event) => setEditDriverForm((current) => ({ ...current, carMake: event.target.value }))} required />
              <Input label="Vehicle Model" value={editDriverForm.carModel} onChange={(event) => setEditDriverForm((current) => ({ ...current, carModel: event.target.value }))} required />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Plate Number" value={editDriverForm.plateNumber} onChange={(event) => setEditDriverForm((current) => ({ ...current, plateNumber: event.target.value }))} required />
              <Input label="Engine Size" type="number" value={editDriverForm.engineSize} onChange={(event) => setEditDriverForm((current) => ({ ...current, engineSize: Number(event.target.value) }))} required />
            </div>
            <Button type="submit" className="w-full" loading={updateDriverMutation.isPending}>Save Driver Changes</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
