/**
 * @fileoverview Page component for driver dashboard.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiGrid,
  FiHome,
  FiHelpCircle,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiNavigation,
  FiPhone,
  FiTrendingUp,
  FiUser
} from "react-icons/fi";
import RideMapbox from "../components/RideMapbox";
import RideChatLauncher from "../components/RideChatLauncher";
import {
  CompactStatCard,
  MobileBottomNav,
  PrimaryActionButton,
  SectionCard,
  StatusPill
} from "../components/RideAppPrimitives";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal
} from "../components/UIComponents";
import {
  acceptDriverRide,
  cancelDriverRide,
  completeDriverRide,
  getDriverDashboard,
  getDriverOffers,
  getDriverRides,
  markDriverArrival,
  rejectDriverRide,
  startDriverRide,
  submitManualDistance,
  updateDriverLocation,
  updateDriverStatus
} from "../features/driver/driverApi";
import { getChatConversations } from "../features/chat/chatApi";
import { approveCashPayment, promptCustomerMpesaPayment } from "../features/rides/paymentApi";
import { getSupportContact } from "../features/support/supportApi";
import { useAuth } from "../hooks/useAuth";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { connectRealtimeSocket } from "../lib/socket";
import { isActiveRide, isCompletedRide, rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

const DRIVER_NAV_ITEMS = [
  { value: "work", label: "Dashboard", icon: FiGrid },
  { value: "offers", label: "Incoming Offers", icon: FiMapPin },
  { value: "trips", label: "My Trips", icon: FiClock },
  { value: "earnings", label: "Earnings", icon: FiDollarSign },
  { value: "wallet", label: "Wallet", icon: FiCreditCard },
  { value: "support", label: "Support", icon: FiHelpCircle },
  { value: "profile", label: "Profile", icon: FiUser }
];

const DRIVER_MOBILE_NAV_ITEMS = [
  { value: "work", label: "Dashboard", icon: FiGrid },
  { value: "trips", label: "Trips", icon: FiClock },
  { value: "earnings", label: "Earnings", icon: FiDollarSign },
  { value: "wallet", label: "Wallet", icon: FiCreditCard },
  { value: "profile", label: "Profile", icon: FiUser }
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

function canShowManualDistanceForm(status) {
  return ["TRIP_STARTED", "PAYMENT_PENDING", "DISPUTED"].includes(status);
}

function DetailRow({ label, value, emphasis = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={emphasis ? "font-semibold text-slate-950" : "font-medium text-slate-700"}>{value}</span>
    </div>
  );
}

function formatOfferDistanceAway(offer) {
  const distance = offer.distanceToPickupKm ?? offer.estimatedDistanceKm;
  return distance ? `${Number(distance).toFixed(1)} km away` : "Nearby request";
}

function formatOfferCountdown(expiresAt) {
  if (!expiresAt) {
    return "Live";
  }

  const seconds = Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Live";
  }

  return `${seconds} sec`;
}

function VehicleThumbnail({ className = "", imageClassName = "" }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-[18px] bg-slate-100 ${className}`}>
      <img
        src="/driver/vehicle-front.avif"
        alt="Driver vehicle"
        className={`h-full w-full object-contain ${imageClassName}`}
      />
    </div>
  );
}

function RoutePoint({ label, value, tone = "pickup", compact = false }) {
  const dotClass = tone === "pickup" ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div className={`flex items-start gap-3 ${compact ? "" : ""}`}>
      <div className="flex flex-col items-center">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dotClass}`} />
        {tone === "pickup" ? <span className="mt-1 h-7 w-px bg-slate-200" /> : null}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className={`mt-1 ${compact ? "text-sm" : "text-[0.95rem]"} font-semibold text-slate-950`}>{value}</p>
      </div>
    </div>
  );
}

function WorkspaceBrand({ subtitle = "Driver" }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-[0_18px_35px_-24px_rgba(22,155,69,0.75)]">
        <FiMapPin className="text-xl" />
      </div>
      <div>
        <div className="flex items-baseline gap-0.5 text-[1.95rem] font-semibold leading-none">
          <span className="text-slate-950">Kitui</span>
          <span className="text-emerald-600">Rides</span>
        </div>
        <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

function SidebarNavButton({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[3rem] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
        active
          ? "bg-emerald-50 text-emerald-700 shadow-[inset_0_0_0_1px_rgba(22,155,69,0.16)]"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon className={`text-lg ${active ? "text-emerald-600" : "text-slate-400"}`} />
      <span>{item.label}</span>
    </button>
  );
}

function DriverMenuModal({
  isOpen,
  onClose,
  driverName,
  supportPhone,
  summaryContent,
  detailsContent,
  onProfile,
  onLogout
}) {
  return (
    <Modal isOpen={isOpen} title="Workspace menu" onClose={onClose} size="xl">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={driverName} size="md" />
            <div>
              <p className="font-semibold text-slate-950">{driverName}</p>
              <p className="text-sm text-slate-500">Driver workspace</p>
            </div>
          </div>
        </div>

        {summaryContent ? (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Live summary</h3>
            <div className="mt-3">{summaryContent}</div>
          </div>
        ) : null}

        {detailsContent}

        <div className="grid gap-3">
          <Button variant="secondary" className="justify-start rounded-2xl" onClick={onProfile}>
            <FiUser />
            Open Profile
          </Button>
          {supportPhone ? (
            <a
              href={`tel:${supportPhone}`}
              className="inline-flex min-h-[3rem] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-slate-300"
            >
              <FiPhone />
              Call Support
            </a>
          ) : null}
          <Button variant="danger" className="justify-start rounded-2xl" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function IncomingOffersPanel({
  offers,
  isLoading,
  isError,
  errorMessage,
  acceptMutation,
  rejectMutation,
  compact = false
}) {
  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (!offers.length) {
    return (
      <EmptyState
        icon="🛰"
        title="No ride offers yet"
        description="Stay online to receive nearby requests."
      />
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <div
          key={offer.id}
          className={`rounded-[24px] border border-slate-200 bg-white ${
            compact ? "p-3.5" : "p-4"
          } shadow-[0_18px_34px_-30px_rgba(15,23,42,0.22)]`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {formatOfferDistanceAway(offer)}
            </span>
            <span className="inline-flex h-11 min-w-[2.9rem] items-center justify-center rounded-full border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-600">
              {formatOfferCountdown(offer.expiresAt)}
            </span>
          </div>

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Ride #{offer.rideId}
          </p>

          <div className="mt-3 space-y-3">
            <RoutePoint label="Pickup" value={offer.pickupAddress} compact={compact} />
            <RoutePoint label="Dropoff" value={offer.dropoffAddress} tone="dropoff" compact={compact} />
          </div>

          <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2"} text-sm`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Fare</p>
              <p className="mt-1 font-semibold text-slate-950">{formatMoney(offer.estimatedFare)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Distance</p>
              <p className="mt-1 font-semibold text-slate-950">{formatDistance(offer.estimatedDistanceKm)}</p>
            </div>
          </div>

          <div className={`mt-4 flex ${compact ? "gap-2.5" : "gap-3"}`}>
            <Button
              className="flex-1 rounded-2xl bg-white text-rose-600 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.35)] hover:bg-rose-50"
              variant="secondary"
              onClick={() => rejectMutation.mutate(offer.rideId)}
              loading={rejectMutation.isPending}
            >
              Reject
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-[#169b45] hover:bg-[#11803a]"
              onClick={() => acceptMutation.mutate(offer.rideId)}
              loading={acceptMutation.isPending}
            >
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DriverTripsPanel({ rides, compact = false, title = "Completed trips" }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">Recent finished rides and earnings snapshots.</p>
        </div>
        <Badge label={`${rides.length}`} size="sm" variant="success" />
      </div>

      {!rides.length ? (
        <EmptyState
          icon="🧾"
          title="No completed rides yet"
          description="Completed trips will build your history here."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {rides.map((ride) => (
            <div
              key={ride.id}
              className={`rounded-[24px] border border-slate-200 bg-white ${
                compact ? "p-3.5" : "p-4"
              } shadow-[0_16px_30px_-30px_rgba(15,23,42,0.18)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {formatTimestamp(ride.completedAt).split(",")[0]}
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">{ride.pickupAddress}</p>
                  <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
                </div>
                <Badge label="Completed" variant="success" size="sm" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-950">{formatMoney(ride.finalFare)}</span>
                <span className="text-slate-500">{formatDistance(ride.chargeableDistanceKm || ride.estimatedDistanceKm || 0)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session, user, logout } = useAuth();
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const [selectedRide, setSelectedRide] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [manualDistance, setManualDistance] = useState("");
  const [tripActionStatus, setTripActionStatus] = useState("");
  const [activeTab, setActiveTab] = useState("work");
  const [earningsRange, setEarningsRange] = useState("today");
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["driver-dashboard"],
    queryFn: getDriverDashboard,
    refetchInterval: 15000
  });
  const ridesQuery = useQuery({
    queryKey: ["driver-rides"],
    queryFn: getDriverRides,
    refetchInterval: 5000
  });
  const offersQuery = useQuery({
    queryKey: ["driver-offers"],
    queryFn: getDriverOffers,
    refetchInterval: 5000
  });
  const supportContactQuery = useQuery({ queryKey: ["support-contact"], queryFn: getSupportContact });

  const rides = ridesQuery.data || [];
  const activeRide = rides.find((ride) => isActiveRide(ride.status)) || dashboardQuery.data?.activeTrip || null;
  const completedRides = rides.filter((ride) => isCompletedRide(ride.status));
  const rideChatQuery = useQuery({
    queryKey: ["ride-chat-thread", "driver", activeRide?.id],
    queryFn: async () => {
      const threads = await getChatConversations({ threadTypes: ["RIDE_CHAT"], rideId: activeRide.id });
      return threads[0] || null;
    },
    enabled: Boolean(activeRide?.id),
    refetchInterval: activeRide ? 5000 : false
  });
  const rideChatThread = rideChatQuery.data || null;

  useEffect(() => {
    const disconnect = connectRealtimeSocket({
      userId: session?.userId,
      onRideUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["driver-rides"] });
        queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
        queryClient.invalidateQueries({ queryKey: ["ride-chat-thread", "driver"] });
      },
      onDriverOffer: () => {
        queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
        queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
      }
    });
    return disconnect;
  }, [queryClient, session?.userId]);

  const refresh = async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ["driver-dashboard"] }),
      queryClient.refetchQueries({ queryKey: ["driver-rides"] }),
      queryClient.refetchQueries({ queryKey: ["driver-offers"] })
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: updateDriverStatus,
    onSuccess: refresh
  });
  const acceptMutation = useMutation({ mutationFn: acceptDriverRide, onSuccess: refresh });
  const rejectMutation = useMutation({ mutationFn: rejectDriverRide, onSuccess: refresh });
  const arriveMutation = useMutation({ mutationFn: markDriverArrival, onSuccess: refresh });
  const startMutation = useMutation({ mutationFn: startDriverRide, onSuccess: refresh });
  const distanceMutation = useMutation({
    mutationFn: ({ rideId, distanceKm }) => submitManualDistance(rideId, distanceKm),
    onSuccess: async () => {
      setManualDistance("");
      await refresh();
    }
  });
  const cashMutation = useMutation({
    mutationFn: ({ rideId, manualDistanceKm }) => approveCashPayment(rideId, manualDistanceKm ? { manualDistanceKm } : {}),
    onSuccess: async () => {
      setTripActionStatus("Cash payment approved. Refreshing the trip so you can complete it.");
      await refresh();
    },
    onError: (error) => {
      setTripActionStatus(error?.response?.data?.message || "Cash payment approval failed. Please try again.");
    }
  });
  const mpesaPromptMutation = useMutation({
    mutationFn: promptCustomerMpesaPayment,
    onSuccess: async () => {
      setTripActionStatus("M-Pesa prompt sent. The trip will close automatically once the customer pays.");
      await refresh();
    },
    onError: (error) => {
      setTripActionStatus(error?.response?.data?.message || "Unable to prompt the customer for M-Pesa payment right now.");
    }
  });
  const completeMutation = useMutation({
    mutationFn: completeDriverRide,
    onSuccess: async () => {
      setTripActionStatus("Trip completed successfully.");
      await refresh();
    },
    onError: (error) => {
      setTripActionStatus(error?.response?.data?.message || "Unable to complete the trip right now.");
    }
  });
  const cancelMutation = useMutation({
    mutationFn: ({ rideId, reason }) => cancelDriverRide(rideId, reason),
    onSuccess: async () => {
      setTripActionStatus("Trip cancelled and sent to support review.");
      await refresh();
    },
    onError: (error) => {
      setTripActionStatus(error?.response?.data?.message || "Unable to cancel the trip right now.");
    }
  });
  const locationMutation = useMutation({
    mutationFn: updateDriverLocation,
    onSuccess: (_, variables) => {
      setCurrentLocation(variables);
      setLocationStatus("Location updated. Customers within 5 km can now see your latest position.");
      refresh();
    },
    onError: () => {
      setLocationStatus("Unable to update your location right now. Please try again.");
    }
  });

  const dashboard = dashboardQuery.data;
  const supportPhone = supportContactQuery.data?.phoneNumber || dashboard?.supportPhoneNumber;
  const offersErrorMessage = offersQuery.error?.response?.data?.message || "Unable to load incoming ride offers right now.";
  const showManualDistanceForm = Boolean(activeRide && canShowManualDistanceForm(activeRide.status));
  const driverMapLocation = currentLocation || (
    dashboard?.latitude != null && dashboard?.longitude != null
      ? { latitude: dashboard.latitude, longitude: dashboard.longitude }
      : null
  );

  useEffect(() => {
    if (dashboard?.latitude != null && dashboard?.longitude != null) {
      setCurrentLocation({ latitude: dashboard.latitude, longitude: dashboard.longitude });
      setLocationStatus(
        dashboard.locationUpdatedAt
          ? `Last location update: ${new Date(dashboard.locationUpdatedAt).toLocaleString()}`
          : "Latest saved location is ready."
      );
      return;
    }
    setLocationStatus("Update your location to appear to customers within 5 km.");
  }, [dashboard?.latitude, dashboard?.longitude, dashboard?.locationUpdatedAt]);

  useEffect(() => {
    if (!activeRide) {
      setTripActionStatus("");
      return;
    }
    if (activeRide.status === "PAYMENT_COMPLETED") {
      setTripActionStatus("Payment is settled. You can now complete the trip.");
    }
  }, [activeRide?.id, activeRide?.status]);

  function updateExactLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Browser location is unavailable on this device.");
      return;
    }

    setLocationStatus("Getting your exact location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationMutation.mutate({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6))
        });
      },
      () => {
        setLocationStatus("Location permission was not granted. Allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  const currentActionCard = useMemo(() => {
    if (!activeRide) {
      return null;
    }
    const paymentSettled = activeRide.paymentApproved
      || activeRide.paymentStatus === "SUCCESS"
      || activeRide.status === "PAYMENT_COMPLETED";
    if (activeRide.status === "DRIVER_ACCEPTED") {
      return {
        title: "Head to pickup",
        description: "Mark arrival once you reach the customer pickup point.",
        action: (
          <PrimaryActionButton className="w-full" onClick={() => arriveMutation.mutate(activeRide.id)} loading={arriveMutation.isPending}>
            Mark Arrived
          </PrimaryActionButton>
        )
      };
    }
    if (activeRide.status === "DRIVER_ARRIVED") {
      return {
        title: "Start trip",
        description: "Start the trip when the customer is on board.",
        action: (
          <PrimaryActionButton className="w-full bg-orange-500 hover:bg-orange-600" onClick={() => startMutation.mutate(activeRide.id)} loading={startMutation.isPending}>
            Start Trip
          </PrimaryActionButton>
        )
      };
    }
    if (activeRide.status === "TRIP_STARTED") {
      return {
        title: "Trip in progress",
        description: activeRide.paymentType === "CASH"
          ? "Approve the cash payment once the customer pays you."
          : "Send an M-Pesa prompt to the customer when the trip is ready to settle.",
        action: activeRide.paymentType === "CASH" ? (
          <PrimaryActionButton
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              cashMutation.mutate({
                rideId: activeRide.id,
                manualDistanceKm: manualDistance ? Number(manualDistance) : undefined
              })
            }
            loading={cashMutation.isPending}
          >
            Approve Cash Payment
          </PrimaryActionButton>
        ) : activeRide.paymentType === "MPESA" ? (
          <PrimaryActionButton
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => mpesaPromptMutation.mutate(activeRide.id)}
            loading={mpesaPromptMutation.isPending}
          >
            Prompt Customer to Pay
          </PrimaryActionButton>
        ) : null
      };
    }
    if (activeRide.status === "PAYMENT_PENDING") {
      if (paymentSettled) {
        return {
          title: "Ready to complete",
          description: "Payment is settled. Complete the trip to release the ride and update both dashboards.",
          action: (
            <PrimaryActionButton className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => completeMutation.mutate(activeRide.id)} loading={completeMutation.isPending}>
              Complete Trip
            </PrimaryActionButton>
          )
        };
      }
      return {
        title: "Payment pending",
        description: activeRide.paymentType === "MPESA"
          ? "Prompt the customer again if they did not receive the M-Pesa request."
          : "Waiting for cash approval to finish settling the trip.",
        action: activeRide.paymentType === "CASH" && !activeRide.paymentApproved ? (
          <PrimaryActionButton
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() =>
              cashMutation.mutate({
                rideId: activeRide.id,
                manualDistanceKm: manualDistance ? Number(manualDistance) : undefined
              })
            }
            loading={cashMutation.isPending}
          >
            Approve Cash Payment
          </PrimaryActionButton>
        ) : activeRide.paymentType === "MPESA" && !activeRide.paymentApproved ? (
          <PrimaryActionButton
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => mpesaPromptMutation.mutate(activeRide.id)}
            loading={mpesaPromptMutation.isPending}
          >
            Prompt Customer to Pay
          </PrimaryActionButton>
        ) : null
      };
    }
    if (activeRide.status === "PAYMENT_COMPLETED") {
      return {
        title: "Ready to complete",
        description: "Payment is settled. Complete the trip to release the ride and update both dashboards.",
        action: (
          <PrimaryActionButton className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => completeMutation.mutate(activeRide.id)} loading={completeMutation.isPending}>
            Complete Trip
          </PrimaryActionButton>
        )
      };
    }
    if (activeRide.status === "DISPUTED") {
      return {
        title: "Ride disputed",
        description: "Support is handling this ride. Use support chat or the hotline if more information is needed.",
        action: supportPhone ? (
          <a href={`tel:${supportPhone}`} className="inline-flex min-h-[3.5rem] w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
            Call Support
          </a>
        ) : null
      };
    }
    return null;
  }, [
    activeRide,
    arriveMutation.isPending,
    cashMutation.isPending,
    completeMutation.isPending,
    manualDistance,
    mpesaPromptMutation.isPending,
    startMutation.isPending,
    supportPhone
  ]);

  function handleNavChange(nextTab) {
    if (nextTab === "profile") {
      navigate("/profile");
      return;
    }
    setActiveTab(nextTab);
  }

  const workspaceTab = activeTab === "offers"
    ? "work"
    : activeTab === "earnings"
      ? "wallet"
      : activeTab;

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const driverName = user
    ? `${user.firstName} ${user.lastName}`
    : dashboard?.fullName || session?.email || "Driver";
  const vehicleName = dashboard?.vehicle
    ? `${dashboard.vehicle.make} ${dashboard.vehicle.model}`
    : "Vehicle pending";
  const vehicleMeta = dashboard?.vehicle
    ? `${dashboard.vehicle.plateNumber} • ${dashboard.vehicle.engineSize}cc`
    : "Vehicle details unavailable";
  const earningsRangeLabel = {
    today: "Today",
    week: "This Week",
    month: "This Month"
  }[earningsRange];

  const availabilityCard = (
    <SectionCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Availability</h2>
          <p className="text-sm text-slate-500">Only verified drivers can go online and receive ride offers.</p>
        </div>
        <Badge
          label={dashboard?.verified ? "Verified" : "Pending approval"}
          variant={dashboard?.verified ? "success" : "warning"}
          size="sm"
        />
      </div>

      <PrimaryActionButton
        className={`w-full ${dashboard?.online ? "bg-rose-600 hover:bg-rose-700" : ""}`}
        onClick={() => statusMutation.mutate(!dashboard?.online)}
        loading={statusMutation.isPending}
      >
        {dashboard?.online ? "Go Offline" : "Go Online"}
      </PrimaryActionButton>

      {dashboard?.vehicle ? (
        <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <VehicleThumbnail className="h-16 w-24 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-slate-500">Vehicle summary</p>
            <p className="mt-1 font-semibold text-slate-950">{vehicleName}</p>
            <p className="text-sm text-slate-500">{vehicleMeta}</p>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );

  const walletSummaryCard = (
    <SectionCard className="space-y-4">
      <div className="rounded-[26px] bg-[#169b45] p-5 text-white shadow-[0_22px_38px_-26px_rgba(22,155,69,0.8)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-50">{earningsRangeLabel}</p>
            <p className="mt-1 text-3xl font-semibold">{formatMoney(dashboard?.wallet?.balance)}</p>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14">
            <FiTrendingUp className="text-xl" />
          </span>
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4">
        <DetailRow label="Trips completed" value={String(completedRides.length)} />
        <DetailRow label="Online time" value={dashboard?.online ? "On duty" : "Offline"} />
        <DetailRow label="Outstanding commission" value={formatMoney(dashboard?.wallet?.outstandingCommission)} emphasis />
      </div>
    </SectionCard>
  );

  const locationCard = (
    <SectionCard className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Location update</h2>
        <p className="text-sm text-slate-500">Keep your latest position fresh so nearby customers can see you.</p>
      </div>
      <PrimaryActionButton
        className="w-full"
        onClick={updateExactLocation}
        loading={locationMutation.isPending}
      >
        Update My Location
      </PrimaryActionButton>
      {driverMapLocation ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <DetailRow label="Latitude" value={Number(driverMapLocation.latitude).toFixed(6)} />
          <div className="mt-3">
            <DetailRow label="Longitude" value={Number(driverMapLocation.longitude).toFixed(6)} />
          </div>
        </div>
      ) : null}
      <p className="text-sm text-slate-500">{locationStatus}</p>
    </SectionCard>
  );

  const supportCard = (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Support</h3>
          <p className="text-sm text-slate-500">The floating support button stays available while you drive.</p>
        </div>
        {supportPhone ? <Badge label="Hotline" variant="teal" size="sm" /> : null}
      </div>
      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {supportPhone
          ? `Need urgent help? Call ${supportPhone} or open the floating support launcher.`
          : "Support contact is loading."}
      </div>
    </SectionCard>
  );

  const highlightedOffer = (offersQuery.data || [])[0] || null;

  const locationPreviewCard = (
    <SectionCard className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Location</h3>
          <p className="text-sm text-slate-500">
            {dashboard?.locationUpdatedAt
              ? `Last updated: ${formatTimestamp(dashboard.locationUpdatedAt)}`
              : "Keep your latest position visible to nearby riders."}
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-2xl"
          onClick={updateExactLocation}
          loading={locationMutation.isPending}
        >
          <FiNavigation />
          Update
        </Button>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
        <RideMapbox
          pickup={activeRide
            ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng }
          : highlightedOffer
            ? { lat: highlightedOffer.pickupLat, lng: highlightedOffer.pickupLng }
            : undefined}
        dropoff={activeRide
          ? { lat: activeRide.dropoffLat, lng: activeRide.dropoffLng }
          : highlightedOffer
            ? { lat: highlightedOffer.dropoffLat, lng: highlightedOffer.dropoffLng }
            : undefined}
        customerLocation={activeRide
          ? {
            lat: activeRide.pickupLat,
            lng: activeRide.pickupLng,
            label: activeRide.customerName
          }
          : highlightedOffer
            ? {
              lat: highlightedOffer.pickupLat,
              lng: highlightedOffer.pickupLng,
              label: highlightedOffer.customerName
            }
            : undefined}
          driverLocation={driverMapLocation ? {
            lat: Number(driverMapLocation.latitude),
            lng: Number(driverMapLocation.longitude),
            label: "You"
          } : undefined}
          heightClassName="h-[10rem] md:h-[12rem]"
          helperText={activeRide
            ? "Your route stays visible while this trip is active."
            : highlightedOffer
              ? "Your latest location and the top incoming request are highlighted here."
              : "Update your location to appear to nearby customers and center the map on you."}
        />
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        {locationStatus}
      </div>
    </SectionCard>
  );

  const currentTripCard = (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Current Trip</h2>
          <p className="text-sm text-slate-500">The active trip stays front and center while you work.</p>
        </div>
        {supportPhone ? (
          <a href={`tel:${supportPhone}`} className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            Call support
          </a>
        ) : null}
      </div>

      {!activeRide ? (
        <div className="flex min-h-[20rem] flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 p-6 text-center">
          <VehicleThumbnail className="h-28 w-52" imageClassName="scale-[1.05]" />
          <p className="mt-6 text-2xl font-semibold text-slate-950">No active trip</p>
          <p className="mt-2 max-w-xs text-sm text-slate-500">Accept an offer to start a trip.</p>
          <Button
            variant="secondary"
            className="mt-6 rounded-2xl px-6"
            onClick={() => setActiveTab("offers")}
          >
            View Offers
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Ride #{activeRide.id}</p>
                <p className="mt-1 font-semibold text-slate-950">{activeRide.customerName}</p>
              </div>
              <Badge label={rideStatusLabel(activeRide.status)} variant={rideStatusVariant(activeRide.status)} size="sm" />
            </div>

            <div className="mt-4 space-y-3">
              <RoutePoint label="Pickup" value={activeRide.pickupAddress} />
              <RoutePoint label="Dropoff" value={activeRide.dropoffAddress} tone="dropoff" />
            </div>

            <div className="mt-4 grid gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <DetailRow label="Fare" value={formatMoney(activeRide.finalFare)} emphasis />
              <DetailRow label="Distance" value={formatDistance(activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0)} />
              <DetailRow label="Phone" value={activeRide.customerPhone} />
              <DetailRow label="Payment" value={activeRide.paymentType} />
            </div>
          </div>

          {showManualDistanceForm ? (
            <div
              className={`rounded-[24px] p-4 ${
                activeRide.manualDistanceRequired || activeRide.status === "DISPUTED"
                  ? "border border-amber-200 bg-amber-50"
                  : "border border-slate-200 bg-slate-50"
              }`}
            >
              <p className={`text-sm ${activeRide.manualDistanceRequired || activeRide.status === "DISPUTED" ? "text-amber-900" : "text-slate-700"}`}>
                {activeRide.manualDistanceRequired
                  ? "Manual KM is required before payment can continue. Enter the final trip distance here."
                  : "You can enter the trip KM here whenever GPS is incomplete or you need to confirm the final distance before payment."}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr,auto]">
                <Input
                  label="Manual KM"
                  type="number"
                  min="0"
                  step="0.1"
                  value={manualDistance}
                  onChange={(event) => setManualDistance(event.target.value)}
                />
                <Button
                  variant="secondary"
                  className="min-h-[3rem] rounded-2xl md:self-end"
                  onClick={() => distanceMutation.mutate({ rideId: activeRide.id, distanceKm: Number(manualDistance) })}
                  loading={distanceMutation.isPending}
                  disabled={!manualDistance}
                >
                  Save Distance
                </Button>
              </div>
            </div>
          ) : null}

          {currentActionCard ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-30px_rgba(15,23,42,0.18)]">
              <p className="font-semibold text-slate-950">{currentActionCard.title}</p>
              <p className="mt-1 text-sm text-slate-500">{currentActionCard.description}</p>
              {currentActionCard.action ? <div className="mt-4">{currentActionCard.action}</div> : null}
            </div>
          ) : null}

          {tripActionStatus ? (
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {tripActionStatus}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {["DRIVER_ACCEPTED", "DRIVER_ARRIVED", "TRIP_STARTED"].includes(activeRide.status) ? (
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => {
                  const reason = window.prompt("Why are you cancelling this trip? Support will review the reason.");
                  if (reason?.trim()) {
                    cancelMutation.mutate({ rideId: activeRide.id, reason: reason.trim() });
                  }
                }}
                loading={cancelMutation.isPending}
              >
                Cancel Trip
              </Button>
            ) : null}
            <Button variant="secondary" className="rounded-2xl" onClick={() => setSelectedRide(activeRide)}>
              View Trip Details
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );

  const offersCard = (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Incoming Offers</h2>
          <p className="text-sm text-slate-500">Large, touch-friendly accept and reject actions.</p>
        </div>
        <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 text-sm font-semibold text-slate-600">
          {(offersQuery.data || []).length}
        </span>
      </div>
      <div className="mt-4">
        <IncomingOffersPanel
          offers={offersQuery.data || []}
          isLoading={offersQuery.isLoading}
          isError={offersQuery.isError}
          errorMessage={offersErrorMessage}
          acceptMutation={acceptMutation}
          rejectMutation={rejectMutation}
        />
      </div>
    </SectionCard>
  );

  const workView = isTabletUp ? (
    <div className="space-y-4">
      {!activeRide ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.15fr,1.15fr,0.9fr,1fr]">
            <SectionCard className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <FiCheckCircle className="text-2xl" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">You are {dashboard?.online ? "Online" : "Offline"}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>{dashboard?.online ? "Online" : "Offline"}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => statusMutation.mutate(!dashboard?.online)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${dashboard?.online ? "bg-emerald-500" : "bg-slate-200"}`}
                aria-label={dashboard?.online ? "Go offline" : "Go online"}
              >
                <span className={`inline-flex h-6 w-6 rounded-full bg-white shadow transition ${dashboard?.online ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </SectionCard>

            <SectionCard className="flex items-center gap-4 py-4">
              <VehicleThumbnail className="h-16 w-28 shrink-0" />
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-950">{vehicleName}</p>
                <p className="mt-1 text-sm text-slate-500">{vehicleMeta}</p>
              </div>
            </SectionCard>

            <SectionCard className="space-y-2 py-4">
              <p className="text-sm font-medium text-slate-500">Wallet Balance</p>
              <p className="text-3xl font-semibold text-slate-950">{formatMoney(dashboard?.wallet?.balance)}</p>
            </SectionCard>

            <SectionCard className="space-y-2 py-4">
              <p className="text-sm font-medium text-slate-500">Outstanding Commission</p>
              <p className="text-3xl font-semibold text-slate-950">{formatMoney(dashboard?.wallet?.outstandingCommission)}</p>
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.08fr,0.92fr,0.78fr]">
            {offersCard}
            {currentTripCard}
            <div className="space-y-4">
              {locationPreviewCard}
              <SectionCard className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Today's Summary</h3>
                  <p className="text-sm text-slate-500">A compact snapshot of the day so far.</p>
                </div>
                <div className="space-y-3">
                  <DetailRow label="Trips Completed" value={String(completedRides.length)} />
                  <DetailRow label="Earnings" value={formatMoney(dashboard?.wallet?.balance)} emphasis />
                  <DetailRow label="Online Time" value={dashboard?.online ? "On duty" : "Offline"} />
                </div>
              </SectionCard>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.02fr,0.98fr]">
          <SectionCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Current Trip</h2>
                <p className="mt-1 text-sm text-slate-500">{rideStatusLabel(activeRide.status)}</p>
              </div>
            </div>
            <RideMapbox
              pickup={{ lat: activeRide.pickupLat, lng: activeRide.pickupLng }}
              dropoff={{ lat: activeRide.dropoffLat, lng: activeRide.dropoffLng }}
              customerLocation={{
                lat: activeRide.pickupLat,
                lng: activeRide.pickupLng,
                label: activeRide.customerName
              }}
              driverLocation={driverMapLocation ? {
                lat: Number(driverMapLocation.latitude),
                lng: Number(driverMapLocation.longitude),
                label: "You"
              } : undefined}
              heightClassName="h-[19rem] md:h-[27rem]"
              helperText="Keep your location updated so the customer can see you approaching and moving."
            />
            <div className="grid gap-4 border-t border-slate-200 px-5 py-4 sm:grid-cols-2">
              <DetailRow label="Fare" value={formatMoney(activeRide.finalFare)} emphasis />
              <DetailRow label="Distance" value={formatDistance(activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0)} />
            </div>
          </SectionCard>

          <div className="space-y-4">
            {currentTripCard}
            {locationPreviewCard}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-4">
      {!activeRide ? (
        <>
          <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.22)]">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
              aria-label="Open menu"
            >
              <FiMenu className="text-lg" />
            </button>
            <div className="min-w-0 flex-1 px-3">
              <p className="text-sm font-semibold text-emerald-700">You are {dashboard?.online ? "Online" : "Offline"}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${dashboard?.online ? "bg-emerald-500" : "bg-slate-300"}`} />
                <span>{dashboard?.online ? "Online" : "Offline"}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => statusMutation.mutate(!dashboard?.online)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${dashboard?.online ? "bg-emerald-500" : "bg-slate-200"}`}
              aria-label={dashboard?.online ? "Go offline" : "Go online"}
            >
              <span className={`inline-flex h-6 w-6 rounded-full bg-white shadow transition ${dashboard?.online ? "translate-x-7" : "translate-x-1"}`} />
            </button>
          </div>

          <SectionCard className="flex items-center gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-950">{vehicleName}</p>
              <p className="mt-1 text-sm text-slate-500">{vehicleMeta}</p>
            </div>
            <VehicleThumbnail className="h-16 w-28 shrink-0" />
          </SectionCard>

          <SectionCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Incoming Offers</h2>
              </div>
              <span className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 text-sm font-semibold text-slate-600">
                {(offersQuery.data || []).length}
              </span>
            </div>
            <div className="mt-4">
              <IncomingOffersPanel
                offers={offersQuery.data || []}
                isLoading={offersQuery.isLoading}
                isError={offersQuery.isError}
                errorMessage={offersErrorMessage}
                acceptMutation={acceptMutation}
                rejectMutation={rejectMutation}
                compact
              />
            </div>
          </SectionCard>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.22)]">
            <button
              type="button"
              onClick={() => setActiveTab("work")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
              aria-label="Current trip"
            >
              <FiArrowLeft className="text-lg" />
            </button>
            <div className="flex-1">
              <p className="text-base font-semibold text-slate-950">Current Trip</p>
            </div>
            <StatusPill label={rideStatusLabel(activeRide.status)} tone="accent" />
          </div>

          <SectionCard className="space-y-4 p-0 overflow-hidden">
            <div className="space-y-4 px-4 pt-4">
              <div className="space-y-3">
                <RoutePoint label="Pickup" value={activeRide.pickupAddress} compact />
                <RoutePoint label="Dropoff" value={activeRide.dropoffAddress} tone="dropoff" compact />
              </div>
            </div>

            <RideMapbox
              pickup={{ lat: activeRide.pickupLat, lng: activeRide.pickupLng }}
              dropoff={{ lat: activeRide.dropoffLat, lng: activeRide.dropoffLng }}
              customerLocation={{
                lat: activeRide.pickupLat,
                lng: activeRide.pickupLng,
                label: activeRide.customerName
              }}
              driverLocation={driverMapLocation ? {
                lat: Number(driverMapLocation.latitude),
                lng: Number(driverMapLocation.longitude),
                label: "You"
              } : undefined}
              heightClassName="h-[16rem]"
              helperText="Keep moving with your live route visible."
            />

            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 px-4 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Fare</p>
                <p className="mt-1 font-semibold text-slate-950">{formatMoney(activeRide.finalFare)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Distance</p>
                <p className="mt-1 font-semibold text-slate-950">{formatDistance(activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0)}</p>
              </div>
            </div>

            <div className="space-y-3 px-4 pb-4">
              {showManualDistanceForm ? (
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
                  <Input
                    label="Manual KM"
                    type="number"
                    min="0"
                    step="0.1"
                    value={manualDistance}
                    onChange={(event) => setManualDistance(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    className="mt-3 min-h-[3rem] w-full rounded-2xl"
                    onClick={() => distanceMutation.mutate({ rideId: activeRide.id, distanceKm: Number(manualDistance) })}
                    loading={distanceMutation.isPending}
                    disabled={!manualDistance}
                  >
                    Save Distance
                  </Button>
                </div>
              ) : null}

              {tripActionStatus ? (
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600">
                  {tripActionStatus}
                </div>
              ) : null}

              {currentActionCard?.action ? <div>{currentActionCard.action}</div> : null}

              <div className="flex gap-3">
                {["DRIVER_ACCEPTED", "DRIVER_ARRIVED", "TRIP_STARTED"].includes(activeRide.status) ? (
                  <Button
                    variant="outline"
                    className="flex-1 rounded-2xl border-rose-300 text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      const reason = window.prompt("Why are you cancelling this trip? Support will review the reason.");
                      if (reason?.trim()) {
                        cancelMutation.mutate({ rideId: activeRide.id, reason: reason.trim() });
                      }
                    }}
                    loading={cancelMutation.isPending}
                  >
                    Cancel Trip
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    className="flex-1 rounded-2xl"
                    onClick={() => setSelectedRide(activeRide)}
                  >
                    View Details
                  </Button>
                )}
                <a
                  href={`tel:${activeRide.customerPhone || supportPhone || ""}`}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-emerald-700"
                >
                  <FiPhone className="text-lg" />
                </a>
              </div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );

  const tripsView = isTabletUp ? (
    <DriverTripsPanel rides={completedRides} />
  ) : (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.22)]">
        <button
          type="button"
          onClick={() => setActiveTab("work")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
          aria-label="Back to dashboard"
        >
          <FiArrowLeft className="text-lg" />
        </button>
        <div>
          <p className="text-base font-semibold text-slate-950">My Trips</p>
        </div>
      </div>
      <DriverTripsPanel rides={completedRides} compact title="Completed" />
    </div>
  );

  const walletView = isTabletUp ? (
    <div className="grid gap-5 xl:grid-cols-[1fr,0.9fr]">
      {walletSummaryCard}
      <SectionCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Driver account snapshot</h3>
          <p className="text-sm text-slate-500">Operational details that support your daily work.</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <DetailRow label="Verified" value={dashboard?.verified ? "Yes" : "Pending"} />
          <div className="mt-3">
            <DetailRow label="Current status" value={dashboard?.online ? "Online" : "Offline"} emphasis />
          </div>
          <div className="mt-3">
            <DetailRow label="Total earned" value={formatMoney(dashboard?.wallet?.totalEarned)} />
          </div>
          <div className="mt-3">
            <DetailRow label="Withdrawn" value={formatMoney(dashboard?.wallet?.totalWithdrawn)} />
          </div>
        </div>
        {availabilityCard}
      </SectionCard>
    </div>
  ) : (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3.5 shadow-[0_18px_34px_-30px_rgba(15,23,42,0.22)]">
        <button
          type="button"
          onClick={() => setActiveTab("work")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
          aria-label="Back to dashboard"
        >
          <FiArrowLeft className="text-lg" />
        </button>
        <div>
          <p className="text-base font-semibold text-slate-950">{activeTab === "earnings" ? "Earnings" : "Wallet"}</p>
        </div>
      </div>

      <SectionCard className="space-y-4">
        <div className="grid grid-cols-3 gap-2 rounded-[18px] bg-slate-50 p-1">
          {[
            { value: "today", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setEarningsRange(option.value)}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                earningsRange === option.value
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="rounded-[26px] bg-[#169b45] p-5 text-white shadow-[0_22px_38px_-26px_rgba(22,155,69,0.8)]">
          <p className="text-sm font-medium text-emerald-50">{activeTab === "earnings" ? "Today's Earnings" : "Wallet Balance"}</p>
          <p className="mt-3 text-4xl font-semibold">{formatMoney(dashboard?.wallet?.balance)}</p>
        </div>

        <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-4">
          <DetailRow label="Trips Completed" value={String(completedRides.length)} />
          <DetailRow label="Online Time" value={dashboard?.online ? "On duty" : "Offline"} />
          <DetailRow label="Outstanding Commission" value={formatMoney(dashboard?.wallet?.outstandingCommission)} emphasis />
        </div>

        <Button variant="secondary" className="w-full rounded-2xl">
          View Earnings History
        </Button>
      </SectionCard>
    </div>
  );

  const supportView = (
    <div className="grid gap-5 xl:grid-cols-[1fr,0.9fr]">
      <SectionCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Driver support</h3>
          <p className="text-sm text-slate-500">Use the floating support launcher for messaging, and the hotline for urgent issues.</p>
        </div>
        {supportPhone ? (
          <a
            href={`tel:${supportPhone}`}
            className="inline-flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            <FiPhone />
            Call support: {supportPhone}
          </a>
        ) : (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            Support hotline is loading.
          </div>
        )}
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Support messaging is always one tap away from the floating button at the bottom-right.
        </div>
      </SectionCard>
      {locationCard}
    </div>
  );

  const driverMenuSummary = (
    <div className="grid gap-3 sm:grid-cols-3">
      <CompactStatCard
        label="Status"
        value={dashboard?.online ? "Online" : "Offline"}
        helper={dashboard?.verified ? "Ready for requests" : "Awaiting verification"}
        tone={dashboard?.online ? "accent" : "muted"}
      />
      <CompactStatCard
        label="Pending offers"
        value={String((offersQuery.data || []).length)}
        helper="Requests waiting for action"
        tone="info"
      />
      <CompactStatCard
        label="Wallet balance"
        value={formatMoney(dashboard?.wallet?.balance)}
        helper={`Commission ${formatMoney(dashboard?.wallet?.outstandingCommission)}`}
        tone="success"
      />
    </div>
  );

  const driverMenuDetails = (
    <div className="space-y-4">
      {availabilityCard}
      {walletSummaryCard}
      {locationCard}
      {supportCard}
      <DriverTripsPanel rides={completedRides.slice(0, 3)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fb] md:p-4">
      <div className="md:grid md:min-h-[calc(100vh-2rem)] md:grid-cols-[15rem,minmax(0,1fr)] md:gap-4">
        {isTabletUp ? (
          <aside className="md:flex md:flex-col md:rounded-[24px] md:border md:border-slate-200 md:bg-white md:p-5 md:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.22)]">
            <WorkspaceBrand subtitle="Driver" />

            <div className="mt-8 space-y-1.5">
              {DRIVER_NAV_ITEMS.map((item) => (
                <SidebarNavButton
                  key={item.value}
                  item={item}
                  active={activeTab === item.value}
                  onClick={() => handleNavChange(item.value)}
                />
              ))}
            </div>

            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="flex min-h-[3rem] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <FiLogOut className="text-lg text-slate-400" />
                <span>Log out</span>
              </button>
            </div>
          </aside>
        ) : null}

        <div className="min-w-0 px-3 pb-28 pt-3 md:flex md:min-h-0 md:flex-col md:px-0 md:pb-0 md:pt-0">
          <div className="min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
            {workspaceTab === "work" ? workView : null}
            {workspaceTab === "trips" ? tripsView : null}
            {workspaceTab === "wallet" ? walletView : null}
            {workspaceTab === "support" ? supportView : null}
          </div>
        </div>
      </div>

      <DriverMenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        driverName={driverName}
        supportPhone={supportPhone}
        summaryContent={driverMenuSummary}
        detailsContent={driverMenuDetails}
        onProfile={() => {
          setMenuOpen(false);
          navigate("/profile");
        }}
        onLogout={() => {
          setMenuOpen(false);
          logout();
          navigate("/login");
        }}
      />

      <RideChatLauncher
        activeRide={activeRide}
        chatThread={rideChatThread}
        participantName={activeRide?.customerName || rideChatThread?.participant?.fullName}
        participantPhone={activeRide?.customerPhone || rideChatThread?.participant?.phoneNumber}
        isLoading={rideChatQuery.isLoading}
        isError={rideChatQuery.isError}
        errorMessage="Unable to load the ride chat right now."
        placeholder="Preparing the ride chat for this trip."
        onActivity={() => {
          if (activeRide?.id) {
            queryClient.invalidateQueries({ queryKey: ["ride-chat-thread", "driver", activeRide.id] });
          }
        }}
      />

      {!isTabletUp && !(workspaceTab === "work" && activeRide)
        ? <MobileBottomNav items={DRIVER_MOBILE_NAV_ITEMS} value={activeTab} onChange={handleNavChange} />
        : null}

      {selectedRide ? (
        <Modal isOpen={Boolean(selectedRide)} title={`Ride #${selectedRide.id}`} onClose={() => setSelectedRide(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Pickup</p>
                <p className="font-semibold text-slate-950">{selectedRide.pickupAddress}</p>
                <p className="text-xs text-slate-500">{selectedRide.pickupLat}, {selectedRide.pickupLng}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Dropoff</p>
                <p className="font-semibold text-slate-950">{selectedRide.dropoffAddress}</p>
                <p className="text-xs text-slate-500">{selectedRide.dropoffLat}, {selectedRide.dropoffLng}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-semibold text-slate-950">{selectedRide.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <p className="font-semibold text-slate-950">{selectedRide.paymentType} • {selectedRide.paymentStatus}</p>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
