import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiClock,
  FiDollarSign,
  FiHelpCircle,
  FiMapPin,
  FiMenu,
  FiNavigation,
  FiPhone,
  FiUser
} from "react-icons/fi";
import RideMapbox from "../components/RideMapbox";
import RideChatLauncher from "../components/RideChatLauncher";
import {
  AppHeader,
  CompactStatCard,
  MapPanel,
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
import { approveCashPayment } from "../features/rides/paymentApi";
import { getSupportContact } from "../features/support/supportApi";
import { useAuth } from "../hooks/useAuth";
import { connectRealtimeSocket } from "../lib/socket";
import { isActiveRide, isCompletedRide, rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

const DRIVER_NAV_ITEMS = [
  { value: "work", label: "Work", icon: FiMapPin },
  { value: "trips", label: "Trips", icon: FiClock },
  { value: "wallet", label: "Wallet", icon: FiDollarSign },
  { value: "support", label: "Support", icon: FiHelpCircle },
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
  rejectMutation
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
        <div key={offer.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950">Ride #{offer.rideId}</p>
              <p className="text-sm text-slate-600">{offer.pickupAddress}</p>
              <p className="text-sm text-slate-500">to {offer.dropoffAddress}</p>
            </div>
            <StatusPill label={formatMoney(offer.estimatedFare)} tone="accent" />
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow label="Customer" value={offer.customerName} />
            <DetailRow label="Phone" value={offer.customerPhone} />
            <DetailRow label="Vehicle" value={offer.vehicleType} />
            <DetailRow label="Trip distance" value={formatDistance(offer.estimatedDistanceKm)} emphasis />
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              className="flex-1 rounded-2xl"
              onClick={() => acceptMutation.mutate(offer.rideId)}
              loading={acceptMutation.isPending}
            >
              Accept
            </Button>
            <Button
              className="flex-1 rounded-2xl"
              variant="secondary"
              onClick={() => rejectMutation.mutate(offer.rideId)}
              loading={rejectMutation.isPending}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DriverTripsPanel({ rides }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Completed trips</h3>
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
            <div key={ride.id} className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{ride.pickupAddress}</p>
                  <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
                </div>
                <Badge label="Completed" variant="success" size="sm" />
              </div>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <DetailRow label="Fare" value={formatMoney(ride.finalFare)} emphasis />
                <DetailRow label="Completed" value={formatTimestamp(ride.completedAt)} />
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
  const [selectedRide, setSelectedRide] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [manualDistance, setManualDistance] = useState("");
  const [tripActionStatus, setTripActionStatus] = useState("");
  const [activeTab, setActiveTab] = useState("work");
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
          : "Wait for the customer to complete M-Pesa payment after the trip.",
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
          ? "The customer must finish the M-Pesa flow before the trip can close."
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
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Vehicle summary</p>
          <p className="mt-2 font-semibold text-slate-950">
            {dashboard.vehicle.make} {dashboard.vehicle.model}
          </p>
          <p className="text-sm text-slate-500">
            {dashboard.vehicle.plateNumber} • {dashboard.vehicle.engineSize}cc
          </p>
        </div>
      ) : null}
    </SectionCard>
  );

  const walletSummaryCard = (
    <SectionCard className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Wallet summary</h2>
        <p className="text-sm text-slate-500">Keep balance and outstanding commission visible, but compact.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Wallet balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(dashboard?.wallet?.balance)}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Outstanding commission</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{formatMoney(dashboard?.wallet?.outstandingCommission)}</p>
        </div>
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

  const workMapPanel = (
    <MapPanel
      title={activeRide ? "Trip map" : "Driver map"}
      subtitle={activeRide
        ? "Keep your route and location in view while the trip is active."
        : "Stay online, refresh your location, and watch for nearby requests."}
      controls={(
        <Button
          size="sm"
          className="rounded-2xl"
          onClick={updateExactLocation}
          loading={locationMutation.isPending}
        >
          <FiNavigation />
          Update Location
        </Button>
      )}
      footer={(
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label={dashboard?.online ? "Online" : "Offline"} tone={dashboard?.online ? "accent" : "muted"} />
          <StatusPill
            label={`${(offersQuery.data || []).length} offers`}
            tone={(offersQuery.data || []).length ? "info" : "muted"}
          />
          {locationStatus ? (
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              {locationStatus}
            </div>
          ) : null}
        </div>
      )}
    >
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
        heightClassName="h-[22rem] md:h-[28rem]"
        helperText={activeRide
          ? "Keep your location updated so the customer can see you approaching and moving."
          : highlightedOffer
            ? "Your latest location and the top incoming request are highlighted here."
            : "Update your location to appear to nearby customers and center the map on you."}
      />
    </MapPanel>
  );

  const currentTripCard = (
    <SectionCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{activeRide ? "Current trip" : "Current trip"}</h2>
          <p className="text-sm text-slate-500">The active trip stays front and center while you work.</p>
        </div>
        {supportPhone ? (
          <a href={`tel:${supportPhone}`} className="text-sm font-semibold text-teal-700 transition hover:text-teal-800">
            Call support
          </a>
        ) : null}
      </div>

      {!activeRide ? (
        <EmptyState
          icon="🚘"
          title="No active trip"
          description="Accept an incoming offer to begin a ride."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Ride #{activeRide.id}</p>
                <p className="font-semibold text-slate-950">{activeRide.pickupAddress}</p>
                <p className="text-sm text-slate-500">to {activeRide.dropoffAddress}</p>
              </div>
              <Badge label={rideStatusLabel(activeRide.status)} variant={rideStatusVariant(activeRide.status)} size="sm" />
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Customer" value={activeRide.customerName} />
              <DetailRow label="Phone" value={activeRide.customerPhone} />
              <DetailRow label="Fare" value={formatMoney(activeRide.finalFare)} emphasis />
              <DetailRow label="Payment" value={activeRide.paymentType} />
              <DetailRow label="Distance" value={formatDistance(activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0)} />
              <DetailRow label="Source" value={activeRide.distanceSource} />
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
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
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
          <h2 className="text-lg font-semibold text-slate-950">Incoming offers</h2>
          <p className="text-sm text-slate-500">Large, touch-friendly accept and reject actions.</p>
        </div>
        <StatusPill label={`${(offersQuery.data || []).length} offers`} tone={(offersQuery.data || []).length ? "accent" : "muted"} />
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

  const workView = (
    <div className="space-y-5">
      {workMapPanel}

      <div className="grid gap-5 xl:grid-cols-[1.12fr,0.88fr]">
        <div className="space-y-5">
          {activeRide ? currentTripCard : offersCard}
        </div>

        <div className="space-y-5">
          <SectionCard className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Location refresh</h2>
              <p className="text-sm text-slate-500">One tap keeps you visible to nearby customers and keeps the map current.</p>
            </div>
            <Button
              className="w-full rounded-2xl"
              onClick={updateExactLocation}
              loading={locationMutation.isPending}
            >
              <FiNavigation />
              Update My Location
            </Button>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {locationStatus}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );

  const tripsView = <DriverTripsPanel rides={completedRides} />;

  const walletView = (
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
    <div className="space-y-5 pb-28 md:pb-8">
      <AppHeader
        eyebrow="KituiRides Driver"
        title={activeRide ? "Active trip in progress" : "Ready for the next request?"}
        subtitle={activeRide
          ? "Your current trip, customer details, and trip controls stay focused on the main screen."
          : "Go online, keep your location fresh, and wait for nearby ride offers to appear."}
        status={(
          <StatusPill
            label={dashboard?.online ? "Online" : "Offline"}
            tone={dashboard?.online ? "accent" : "muted"}
            hint={dashboard?.verified ? "Verified" : "Pending approval"}
          />
        )}
        trailing={(
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Open menu"
          >
            <FiMenu className="text-xl" />
          </button>
        )}
      />

      <div className="hidden md:flex md:flex-wrap md:items-center md:gap-3">
        {DRIVER_NAV_ITEMS.map((item) => {
          const active = activeTab === item.value;
          const Icon = item.icon;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => handleNavChange(item.value)}
              className={`inline-flex min-h-[3rem] items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <Icon />
              {item.label}
            </button>
          );
        })}
      </div>

      {activeTab === "work" ? workView : null}
      {activeTab === "trips" ? tripsView : null}
      {activeTab === "wallet" ? walletView : null}
      {activeTab === "support" ? supportView : null}

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

      <MobileBottomNav items={DRIVER_NAV_ITEMS} value={activeTab} onChange={handleNavChange} />

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
