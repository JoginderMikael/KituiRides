/**
 * @fileoverview Page component for customer dashboard.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiClock,
  FiCreditCard,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiPhone,
  FiPlus,
  FiUser
} from "react-icons/fi";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
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
  completeCustomerRide,
  disputeRide,
  estimateRide,
  getCustomerRides,
  nearbyDrivers,
  requestRide
} from "../features/customer/customerApi";
import { getChatConversations } from "../features/chat/chatApi";
import { initiateMpesaPayment } from "../features/rides/paymentApi";
import { getSupportContact } from "../features/support/supportApi";
import { useAuth } from "../hooks/useAuth";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { apiClient, unwrap } from "../lib/apiClient";
import { geocodeAddress, reverseGeocode } from "../lib/googleMaps";
import { connectRealtimeSocket } from "../lib/socket";
import {
  isActiveRide,
  isCancelledRide,
  isCompletedRide,
  rideStatusLabel,
  rideStatusVariant
} from "../lib/rideStatus";

const DEFAULT_FORM = {
  pickupLat: -1.3771,
  pickupLng: 38.0106,
  dropoffLat: -1.3656,
  dropoffLng: 38.0118,
  pickupAddress: "Kitui Town CBD",
  dropoffAddress: "Kalundu",
  vehicleType: "CAR",
  paymentType: "MPESA"
};

const CUSTOMER_NAV_ITEMS = [
  { value: "ride", label: "Home", icon: FiHome },
  { value: "trips", label: "Trips", icon: FiClock },
  { value: "payments", label: "Payments", icon: FiCreditCard },
  { value: "support", label: "Support", icon: FiHelpCircle },
  { value: "profile", label: "Profile", icon: FiUser }
];

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function toMpesaPhoneNumber(phoneNumber) {
  if (!phoneNumber) {
    return "";
  }
  if (phoneNumber.startsWith("254")) {
    return phoneNumber;
  }
  if (phoneNumber.startsWith("0")) {
    return `254${phoneNumber.slice(1)}`;
  }
  return phoneNumber;
}

function formatDistance(value) {
  return `${Number(value || 0).toFixed(2)} km`;
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
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

function DetailRow({ label, value, emphasis = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={emphasis ? "font-semibold text-slate-950" : "font-medium text-slate-700"}>{value}</span>
    </div>
  );
}

function WorkspaceBrand({ subtitle = "Customer" }) {
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

function CompactLocationField({ label, value, accentClass, onFocus, onChange, placeholder }) {
  return (
    <label className="flex min-h-[4.4rem] items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.28)]">
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${accentClass}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</span>
        <input
          value={value}
          onFocus={onFocus}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-1.5 w-full border-0 bg-transparent p-0 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
        />
      </span>
    </label>
  );
}

function CustomerMenuModal({
  isOpen,
  onClose,
  userName,
  supportPhone,
  activeRide,
  nearbyDriversCount,
  completedTripsCount,
  onProfile,
  onLogout
}) {
  return (
    <Modal isOpen={isOpen} title="Menu" onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={userName} size="md" />
            <div>
              <p className="font-semibold text-slate-950">{userName}</p>
              <p className="text-sm text-slate-500">Customer account</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Ride summary</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <CompactStatCard
              label="Active ride"
              value={activeRide ? "1" : "0"}
              helper={activeRide ? rideStatusLabel(activeRide.status) : "No ride right now"}
              tone={activeRide ? "accent" : "muted"}
            />
            <CompactStatCard
              label="Nearby drivers"
              value={String(nearbyDriversCount)}
              helper="Live around your pickup"
              tone="info"
            />
            <CompactStatCard
              label="Completed trips"
              value={String(completedTripsCount)}
              helper="Open Trips to review them"
              tone="success"
            />
          </div>
        </div>

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

function FareSummaryCard({
  estimateQuery,
  estimatedFare,
  estimatedTripDistanceKm,
  directDistanceKm,
  distanceBufferKm,
  distanceBufferPercent,
  quoteWarning,
  hasBackendEstimate,
  showDetails,
  onToggleDetails
}) {
  return (
    <SectionCard className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Fare summary</h3>
          <p className="text-sm text-slate-500">Compact pricing first, details only when you need them.</p>
        </div>
        <button
          type="button"
          onClick={onToggleDetails}
          className="text-sm font-semibold text-teal-700 transition hover:text-teal-800"
        >
          {showDetails ? "Hide details" : "Fare details"}
        </button>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
        <DetailRow
          label="Estimated fare"
          value={estimateQuery.isFetching ? "Calculating..." : hasBackendEstimate ? formatMoney(estimatedFare) : "Unavailable"}
          emphasis
        />
        <div className="mt-3 border-t border-slate-200 pt-3">
          <DetailRow label="Service fee" value="Included" />
          <div className="mt-3">
            <DetailRow label="Total" value={hasBackendEstimate ? formatMoney(estimatedFare) : "Waiting for quote"} emphasis />
          </div>
        </div>
      </div>

      {quoteWarning ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {quoteWarning}
        </div>
      ) : null}

      {showDetails ? (
        <div className="space-y-3 rounded-[24px] border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <DetailRow
            label="Backend trip distance"
            value={hasBackendEstimate ? formatDistance(estimatedTripDistanceKm) : "Calculating..."}
          />
          {directDistanceKm > 0 ? <DetailRow label="Direct route distance" value={formatDistance(directDistanceKm)} /> : null}
          {distanceBufferKm > 0 ? (
            <DetailRow label={`Distance buffer (${distanceBufferPercent}%)`} value={formatDistance(distanceBufferKm)} />
          ) : null}
          {estimateQuery.data?.pricingBasis ? <DetailRow label="Pricing basis" value={estimateQuery.data.pricingBasis} /> : null}
        </div>
      ) : null}
    </SectionCard>
  );
}

function NearbyDriversPanel({
  drivers,
  isLoading,
  isError,
  errorMessage,
  canRequestRide,
  requestRideMutation,
  requestingDriverId,
  onRequestDriver
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

  if (!drivers.length) {
    return (
      <EmptyState
        icon="🧭"
        title="No nearby drivers"
        description="Stay ready. Drivers close to your pickup will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {drivers.map((driver) => (
        <div key={driver.riderId} className="rounded-[24px] border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={driver.driverName} size="md" />
              <div>
                <p className="font-semibold text-slate-950">{driver.driverName}</p>
                <p className="text-sm text-slate-500">{driver.vehicleModel} • {driver.plateNumber}</p>
              </div>
            </div>
            <StatusPill label={`${driver.etaMinutes} min`} tone="accent" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <DetailRow label="Distance" value={formatDistance(driver.distanceToPickupKm)} />
            <DetailRow label="Estimate" value={formatMoney(driver.estimatedPrice)} emphasis />
          </div>
          <Button
            className="mt-4 w-full rounded-2xl"
            disabled={!canRequestRide || requestRideMutation.isPending}
            loading={requestRideMutation.isPending && requestingDriverId === driver.riderId}
            onClick={() => onRequestDriver(driver.riderId)}
          >
            Request Driver
          </Button>
        </div>
      ))}
    </div>
  );
}

function RideSummaryList({ title, rides, emptyTitle, emptyDescription, tone = "success" }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="text-sm text-slate-500">Your latest ride activity lives here.</p>
        </div>
        <Badge label={`${rides.length}`} size="sm" variant={tone === "success" ? "teal" : "default"} />
      </div>

      {!rides.length ? (
        <EmptyState icon="🛣" title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="mt-4 space-y-3">
          {rides.map((ride) => (
            <div
              key={ride.id}
              className={`rounded-[24px] border p-4 ${
                tone === "success" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{ride.pickupAddress}</p>
                  <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
                </div>
                <Badge
                  label={rideStatusLabel(ride.status)}
                  variant={tone === "success" ? "success" : rideStatusVariant(ride.status)}
                  size="sm"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <DetailRow label="Fare" value={formatMoney(ride.finalFare || ride.estimatedFare)} emphasis />
                <DetailRow label="Updated" value={formatTimestamp(ride.completedAt || ride.cancelledAt || ride.requestedAt)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session, logout } = useAuth();
  const isTabletUp = useMediaQuery("(min-width: 768px)");
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mapMode, setMapMode] = useState("pickup");
  const [activeTab, setActiveTab] = useState("ride");
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentRide, setPaymentRide] = useState(null);
  const [paymentActionStatus, setPaymentActionStatus] = useState("");
  const [requestingDriverId, setRequestingDriverId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(toMpesaPhoneNumber(user?.phoneNumber || session?.phoneNumber || ""));
  const [locationStatus, setLocationStatus] = useState("");
  const [pickupSearchStatus, setPickupSearchStatus] = useState("");
  const [dropoffSearchStatus, setDropoffSearchStatus] = useState("");
  const [plannerOpen, setPlannerOpen] = useState(true);
  const [nearbySheetOpen, setNearbySheetOpen] = useState(false);
  const [showFareDetails, setShowFareDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastGeocodedPickupRef = useRef("");
  const lastGeocodedDropoffRef = useRef("");
  const lastNearbyCountRef = useRef(0);
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    setPhoneNumber((current) => current || toMpesaPhoneNumber(user?.phoneNumber || ""));
  }, [user?.phoneNumber]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Browser location is unavailable. You can still set pickup on the map.");
      return;
    }

    setLocationStatus("Finding your current pickup location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        };
        let address = "Current location";
        try {
          address = await reverseGeocode(googleMapsApiKey, coordinates) || address;
        } catch {
          address = "Current location";
        }
        lastGeocodedPickupRef.current = address;
        setForm((current) => ({
          ...current,
          pickupLat: coordinates.lat,
          pickupLng: coordinates.lng,
          pickupAddress: address
        }));
        setLocationStatus("Pickup set from your current location. You can still adjust it.");
      },
      () => {
        setLocationStatus("Location permission was not granted. You can set pickup manually.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [googleMapsApiKey]);

  const nearbyDriverParams = useMemo(
    () => ({
      pickupLat: Number(form.pickupLat),
      pickupLng: Number(form.pickupLng),
      dropoffLat: Number(form.dropoffLat),
      dropoffLng: Number(form.dropoffLng),
      vehicleType: form.vehicleType
    }),
    [form.dropoffLat, form.dropoffLng, form.pickupLat, form.pickupLng, form.vehicleType]
  );

  const ridesQuery = useQuery({ queryKey: ["customer-rides"], queryFn: getCustomerRides });
  const driversQuery = useQuery({
    queryKey: ["nearby-drivers", nearbyDriverParams],
    queryFn: () => nearbyDrivers(nearbyDriverParams)
  });
  const estimateQuery = useQuery({
    queryKey: ["ride-estimate", nearbyDriverParams],
    queryFn: () => estimateRide(nearbyDriverParams),
    enabled: Object.values(nearbyDriverParams).every((value) => (
      typeof value === "string" ? value.length > 0 : Number.isFinite(value)
    ))
  });
  const supportContactQuery = useQuery({
    queryKey: ["support-contact"],
    queryFn: getSupportContact
  });

  const rides = ridesQuery.data || [];
  const activeRide = rides.find((ride) => isActiveRide(ride.status)) || null;
  const completedRides = rides.filter((ride) => isCompletedRide(ride.status));
  const cancelledRides = rides.filter((ride) => isCancelledRide(ride.status) || ride.status === "DRIVER_REJECTED");
  const rideChatQuery = useQuery({
    queryKey: ["ride-chat-thread", "customer", activeRide?.id],
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
      onRideUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
        queryClient.invalidateQueries({ queryKey: ["ride-chat-thread", "customer"] });
      },
      onNearbyDrivers: () => queryClient.invalidateQueries({ queryKey: ["nearby-drivers", nearbyDriverParams] })
    });
    return disconnect;
  }, [nearbyDriverParams, queryClient]);

  const requestRideMutation = useMutation({
    mutationFn: requestRide,
    onSuccess: () => {
      setForm((current) => ({ ...DEFAULT_FORM, paymentType: current.paymentType, vehicleType: current.vehicleType }));
      setPlannerOpen(false);
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      queryClient.invalidateQueries({ queryKey: ["nearby-drivers", nearbyDriverParams] });
    }
  });

  const cancelRideMutation = useMutation({
    mutationFn: (rideId) => unwrap(apiClient.post(`/customer/rides/${rideId}/cancel`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-rides"] })
  });

  const completeRideMutation = useMutation({
    mutationFn: completeCustomerRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      queryClient.invalidateQueries({ queryKey: ["ride-chat-thread", "customer"] });
    }
  });

  const mpesaMutation = useMutation({
    mutationFn: initiateMpesaPayment,
    onSuccess: () => {
      setPaymentActionStatus("STK push sent. Confirm the payment on your phone.");
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      setPaymentRide(null);
    },
    onError: (error) => {
      setPaymentActionStatus(error?.response?.data?.message || "Unable to send the M-Pesa prompt right now.");
    }
  });

  const disputeMutation = useMutation({
    mutationFn: ({ rideId, reason }) => disputeRide(rideId, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-rides"] })
  });

  const estimatedTripDistanceKm = positiveNumber(estimateQuery.data?.estimatedDistanceKm);
  const estimatedFare = positiveNumber(estimateQuery.data?.estimatedFare);
  const directDistanceKm = positiveNumber(estimateQuery.data?.directDistanceKm);
  const distanceBufferKm = positiveNumber(estimateQuery.data?.distanceBufferKm);
  const distanceBufferPercent = positiveNumber(estimateQuery.data?.distanceBufferPercent);
  const hasBackendEstimate = estimatedTripDistanceKm > 0 && estimatedFare > 0;
  const quoteWarning = estimateQuery.isError
    ? estimateQuery.error?.response?.data?.message || "Unable to calculate the fare right now."
    : !estimateQuery.isLoading && !hasBackendEstimate
      ? "Waiting for the backend fare quote."
      : "";
  const supportPhone = supportContactQuery.data?.phoneNumber;
  const canRequestRide = !activeRide;
  const nearbyDriversError = driversQuery.error?.response?.data?.message
    || (driversQuery.error?.response?.status === 403
      ? "Nearby drivers could not load because this session is not authorized as a customer. Log in as the customer in a separate browser or profile when testing driver and customer side by side."
      : "Unable to load nearby drivers right now.");

  useEffect(() => {
    const nextCount = (driversQuery.data || []).length;
    if (!activeRide && lastNearbyCountRef.current === 0 && nextCount > 0) {
      setNearbySheetOpen(true);
    }
    if (activeRide) {
      setNearbySheetOpen(false);
    }
    lastNearbyCountRef.current = nextCount;
  }, [activeRide, driversQuery.data]);

  useEffect(() => {
    const query = form.pickupAddress?.trim() || "";
    if (mapMode !== "pickup" || query.length < 3 || lastGeocodedPickupRef.current === query) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      setPickupSearchStatus("Searching pickup on the map...");
      try {
        const result = await geocodeAddress(googleMapsApiKey, query);
        if (!result) {
          setPickupSearchStatus("No matching pickup found. You can click the map instead.");
          return;
        }
        lastGeocodedPickupRef.current = result.address || query;
        setForm((current) => ({
          ...current,
          pickupLat: result.lat,
          pickupLng: result.lng,
          pickupAddress: result.address || current.pickupAddress
        }));
        setPickupSearchStatus("Pickup matched on the map. You can still adjust it.");
      } catch {
        setPickupSearchStatus("Map search is unavailable for this key. Click the map to set pickup.");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [form.pickupAddress, googleMapsApiKey, mapMode]);

  useEffect(() => {
    const query = form.dropoffAddress?.trim() || "";
    if (mapMode !== "dropoff" || query.length < 3 || lastGeocodedDropoffRef.current === query) {
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      setDropoffSearchStatus("Searching dropoff on the map...");
      try {
        const result = await geocodeAddress(googleMapsApiKey, query);
        if (!result) {
          setDropoffSearchStatus("No matching place found. You can click the map instead.");
          return;
        }
        lastGeocodedDropoffRef.current = result.address || query;
        setForm((current) => ({
          ...current,
          dropoffLat: result.lat,
          dropoffLng: result.lng,
          dropoffAddress: result.address || current.dropoffAddress
        }));
        setDropoffSearchStatus("Dropoff matched on the map. You can still adjust it.");
      } catch {
        setDropoffSearchStatus("Map search is unavailable for this key. Click the map to set dropoff.");
      }
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [form.dropoffAddress, googleMapsApiKey, mapMode]);

  const updatePointFromMap = async (point, coordinates, details = {}) => {
    let address = details.address || (point === "pickup" ? "Selected pickup" : "Selected dropoff");
    if (!details.address) {
      try {
        address = await reverseGeocode(googleMapsApiKey, coordinates) || address;
      } catch {
        address = point === "pickup" ? "Selected pickup" : "Selected dropoff";
      }
    }

    if (point === "pickup") {
      lastGeocodedPickupRef.current = address;
      setPickupSearchStatus("Pickup selected on the map.");
      setForm((current) => ({
        ...current,
        pickupLat: coordinates.lat,
        pickupLng: coordinates.lng,
        pickupAddress: address
      }));
      return;
    }

    lastGeocodedDropoffRef.current = address;
    setDropoffSearchStatus("Dropoff selected on the map.");
    setForm((current) => ({
      ...current,
      dropoffLat: coordinates.lat,
      dropoffLng: coordinates.lng,
      dropoffAddress: address
    }));
  };

  const activeLocationStatus = mapMode === "pickup"
    ? pickupSearchStatus || locationStatus
    : dropoffSearchStatus || locationStatus;

  function requestDriver(driverId) {
    setRequestingDriverId(driverId);
    requestRideMutation.mutate(
      {
        pickupLat: Number(form.pickupLat),
        pickupLng: Number(form.pickupLng),
        dropoffLat: Number(form.dropoffLat),
        dropoffLng: Number(form.dropoffLng),
        pickupAddress: form.pickupAddress,
        dropoffAddress: form.dropoffAddress,
        vehicleType: form.vehicleType,
        paymentType: form.paymentType,
        preferredDriverId: driverId
      },
      {
        onSettled: () => setRequestingDriverId(null)
      }
    );
  }

  function handleMainRequestRide() {
    requestRideMutation.mutate({
      pickupLat: Number(form.pickupLat),
      pickupLng: Number(form.pickupLng),
      dropoffLat: Number(form.dropoffLat),
      dropoffLng: Number(form.dropoffLng),
      pickupAddress: form.pickupAddress,
      dropoffAddress: form.dropoffAddress,
      vehicleType: form.vehicleType,
      paymentType: form.paymentType
    });
  }

  function handleNavChange(nextTab) {
    if (nextTab === "profile") {
      navigate("/profile");
      return;
    }
    setActiveTab(nextTab);
  }

  const fareLabel = estimateQuery.isFetching
    ? "Calculating..."
    : hasBackendEstimate
      ? formatMoney(estimatedFare)
      : "Unavailable";

  const locationEditors = (
    <div className="grid gap-3">
      <CompactLocationField
        label="Pickup"
        value={form.pickupAddress}
        onFocus={() => setMapMode("pickup")}
        onChange={(event) => setForm((current) => ({ ...current, pickupAddress: event.target.value }))}
        placeholder="Current location"
        accentClass="bg-emerald-500"
      />
      <CompactLocationField
        label="Dropoff"
        value={form.dropoffAddress}
        onFocus={() => setMapMode("dropoff")}
        onChange={(event) => setForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
        placeholder="Where to?"
        accentClass="bg-rose-500"
      />
    </div>
  );

  const desktopLocationStrip = (
    <div className="hidden gap-3 lg:grid lg:grid-cols-[1fr,1fr,3.2rem]">
      <CompactLocationField
        label="Pickup"
        value={form.pickupAddress}
        onFocus={() => setMapMode("pickup")}
        onChange={(event) => setForm((current) => ({ ...current, pickupAddress: event.target.value }))}
        placeholder="Current location"
        accentClass="bg-emerald-500"
      />
      <CompactLocationField
        label="Dropoff"
        value={form.dropoffAddress}
        onFocus={() => setMapMode("dropoff")}
        onChange={(event) => setForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
        placeholder="Kalundu, Kitui"
        accentClass="bg-rose-500"
      />
      <button
        type="button"
        onClick={() => setMapMode((current) => (current === "pickup" ? "dropoff" : "pickup"))}
        className="inline-flex min-h-[4.4rem] items-center justify-center rounded-[18px] border border-slate-200 bg-white text-slate-700 shadow-[0_12px_28px_-26px_rgba(15,23,42,0.28)] transition hover:border-slate-300"
        aria-label="Toggle map selection focus"
      >
        <FiPlus className="text-xl" />
      </button>
    </div>
  );

  const plannerControls = (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">Plan Your Ride</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Choose a vehicle and request a ride.</p>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">Vehicle Type</p>
        <div className="mt-3 grid gap-3">
          {[
            { value: "CAR", label: "Car", helper: "4 seats" },
            { value: "MOTORCYCLE", label: "Motorcycle", helper: "1 seat" }
          ].map((option) => {
            const active = form.vehicleType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, vehicleType: option.value }))}
                className={`flex items-center justify-between rounded-[18px] border px-4 py-3 transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span>
                  <span className={`block text-sm font-semibold ${active ? "text-emerald-700" : "text-slate-900"}`}>{option.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{option.helper}</span>
                </span>
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"}`}>
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">Payment Method</p>
        <div className="mt-3 grid gap-3">
          {[
            { value: "MPESA", label: "M-Pesa", helper: "Recommended" },
            { value: "CASH", label: "Cash", helper: "Pay directly" }
          ].map((option) => {
            const active = form.paymentType === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm((current) => ({ ...current, paymentType: option.value }))}
                className={`flex items-center justify-between rounded-[18px] border px-4 py-3 transition ${
                  active
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-white text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {option.value === "MPESA" ? <FiCreditCard /> : <FiMapPin className="rotate-90" />}
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${active ? "text-emerald-700" : "text-slate-900"}`}>{option.label}</span>
                    <span className="mt-1 block text-xs text-slate-500">{option.helper}</span>
                  </span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${option.value === "MPESA" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {option.helper}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-500">Estimated Fare</span>
          <span className="text-lg font-semibold text-slate-950">{fareLabel}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {hasBackendEstimate
            ? `${formatDistance(estimatedTripDistanceKm)} estimated distance`
            : "Your fare quote will appear as soon as the backend responds."}
        </p>
      </div>

      {quoteWarning ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {quoteWarning}
        </div>
      ) : null}

      {!canRequestRide ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          You already have an active ride. Complete, resolve, or cancel it before requesting another one.
        </div>
      ) : null}

      <PrimaryActionButton
        className="w-full"
        onClick={handleMainRequestRide}
        disabled={!canRequestRide}
        loading={requestRideMutation.isPending && requestingDriverId == null}
      >
        {canRequestRide ? "Request Ride" : "Ride in Progress"}
      </PrimaryActionButton>
    </div>
  );

  const customerName = user ? `${user.firstName} ${user.lastName}` : session?.email || "Customer";

  const rideHomeView = (
    <div className="space-y-4">
      {!activeRide && isLargeScreen ? desktopLocationStrip : null}

      {activeRide ? (
        <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
          <div className="space-y-4">
            <SectionCard className="overflow-hidden p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Live Ride</p>
                    <p className="mt-1 text-sm text-slate-500">{rideStatusLabel(activeRide.status)}</p>
                  </div>
                  <Badge label={rideStatusLabel(activeRide.status)} variant={rideStatusVariant(activeRide.status)} size="sm" />
                </div>
              </div>
              <div className="p-0">
                <RideMapbox
                  pickup={{ lat: Number(activeRide.pickupLat), lng: Number(activeRide.pickupLng) }}
                  dropoff={{ lat: Number(activeRide.dropoffLat), lng: Number(activeRide.dropoffLng) }}
                  nearbyDrivers={[]}
                  driverLocation={activeRide.riderLat != null && activeRide.riderLng != null ? {
                    lat: activeRide.riderLat,
                    lng: activeRide.riderLng,
                    label: activeRide.riderName
                  } : undefined}
                  heightClassName="h-[15.5rem] md:h-[22rem]"
                  helperText="Your assigned driver's latest location is shown on the route map."
                />
              </div>
            </SectionCard>

            {!isLargeScreen ? (
              <SectionCard className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={activeRide.riderName || "Driver"} size="md" />
                    <div>
                      <p className="font-semibold text-slate-950">{activeRide.riderName || "Matching driver"}</p>
                      <p className="text-sm text-slate-500">{activeRide.riderPhone || "Driver details will appear here"}</p>
                    </div>
                  </div>
                  <Badge label={activeRide.paymentType} variant="teal" size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {activeRide.riderPhone ? (
                    <a
                      href={`tel:${activeRide.riderPhone}`}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Call
                    </a>
                  ) : null}
                  <Button variant="secondary" className="rounded-2xl" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}>
                    Message
                  </Button>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Trip Details</p>
                  <div className="mt-4 space-y-3">
                    <DetailRow label="Pickup" value={activeRide.pickupAddress} />
                    <DetailRow label="Dropoff" value={activeRide.dropoffAddress} />
                    <DetailRow label="Fare" value={formatMoney(activeRide.finalFare)} emphasis />
                  </div>
                </div>

                {["TRIP_STARTED", "PAYMENT_PENDING"].includes(activeRide.status) && activeRide.paymentType === "MPESA" && !activeRide.paymentApproved ? (
                  <PrimaryActionButton className="w-full" onClick={() => setPaymentRide(activeRide)}>
                    Pay via M-Pesa
                  </PrimaryActionButton>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl border-rose-300 text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      if (window.confirm("Cancel this ride?")) {
                        cancelRideMutation.mutate(activeRide.id);
                      }
                    }}
                    loading={cancelRideMutation.isPending}
                  >
                    Cancel Ride
                  </Button>
                )}
              </SectionCard>
            ) : null}
          </div>

          {isLargeScreen ? (
            <SectionCard className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Live ride</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{activeRide.pickupAddress}</h2>
                  <p className="text-sm text-slate-500">to {activeRide.dropoffAddress}</p>
                </div>
                <Badge label={activeRide.paymentType} variant="teal" size="sm" />
              </div>

              {activeRide.riderName ? (
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Driver Info</p>
                  <p className="mt-2 font-semibold text-slate-950">{activeRide.riderName}</p>
                  <p className="text-sm text-slate-500">{activeRide.riderPhone}</p>
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  We are still matching you with a driver.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Payment</p>
                  <p className="mt-2 font-semibold text-slate-950">{activeRide.paymentType}</p>
                  <p className="text-sm text-slate-500">{activeRide.paymentStatus}</p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Trip Total</p>
                  <p className="mt-2 font-semibold text-slate-950">{formatMoney(activeRide.finalFare)}</p>
                  <p className="text-sm text-slate-500">{formatDistance(activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0)}</p>
                </div>
              </div>

              {["TRIP_STARTED", "PAYMENT_PENDING"].includes(activeRide.status) && activeRide.paymentType === "MPESA" && !activeRide.paymentApproved ? (
                <PrimaryActionButton className="w-full" onClick={() => setPaymentRide(activeRide)}>
                  Pay via M-Pesa
                </PrimaryActionButton>
              ) : null}

              {paymentActionStatus ? (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  {paymentActionStatus}
                </div>
              ) : null}

              {activeRide.status === "PAYMENT_PENDING" && activeRide.paymentType === "CASH" ? (
                <div className="rounded-[18px] border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  Pay cash to the driver. The trip moves forward after the driver confirms the payment.
                </div>
              ) : null}

              {activeRide.manualDistanceRequired ? (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  GPS distance was incomplete. The driver or support must confirm final distance before payment can continue.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {activeRide.status === "PAYMENT_COMPLETED" ? (
                  <PrimaryActionButton
                    className="w-full"
                    onClick={() => completeRideMutation.mutate(activeRide.id)}
                    loading={completeRideMutation.isPending}
                  >
                    Complete Trip
                  </PrimaryActionButton>
                ) : null}
                <Button
                  variant="outline"
                  className="w-full rounded-2xl border-rose-300 text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    if (window.confirm("Cancel this ride?")) {
                      cancelRideMutation.mutate(activeRide.id);
                    }
                  }}
                  loading={cancelRideMutation.isPending}
                >
                  Cancel Ride
                </Button>
                <Button
                  variant="secondary"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    const reason = window.prompt("Describe the dispute reason");
                    if (reason) {
                      disputeMutation.mutate({ rideId: activeRide.id, reason });
                    }
                  }}
                  loading={disputeMutation.isPending}
                >
                  Raise Dispute
                </Button>
                <Button variant="secondary" className="w-full rounded-2xl" onClick={() => setSelectedRide(activeRide)}>
                  View Details
                </Button>
              </div>

              {supportPhone ? (
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                >
                  Call Support
                </a>
              ) : null}
            </SectionCard>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[0.82fr,1.18fr,0.92fr]">
            {isLargeScreen ? (
              <SectionCard className="space-y-5">
                {plannerControls}
              </SectionCard>
            ) : null}

            <SectionCard className="overflow-hidden p-0">
              <div className="relative">
                <RideMapbox
                  pickup={{ lat: Number(form.pickupLat), lng: Number(form.pickupLng) }}
                  dropoff={{ lat: Number(form.dropoffLat), lng: Number(form.dropoffLng) }}
                  nearbyDrivers={driversQuery.data || []}
                  activePoint={mapMode}
                  onPointSelect={updatePointFromMap}
                  heightClassName="h-[18rem] md:h-[28rem] lg:h-[30.5rem]"
                  helperText={`Setting ${mapMode === "pickup" ? "pickup" : "dropoff"} location. Click the map or a place label to adjust it.`}
                />
              </div>
            </SectionCard>

            {isLargeScreen ? (
              <div className="space-y-4">
                <SectionCard className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Live Ride</h3>
                      <p className="text-sm text-slate-500">Your trip details will appear here.</p>
                    </div>
                    <StatusPill label="No active ride" tone="muted" />
                  </div>
                  <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                    You have no active ride right now.
                  </div>
                </SectionCard>

                <SectionCard className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Nearby Drivers</h3>
                      <p className="text-sm text-slate-500">{(driversQuery.data || []).length} driver matches around you.</p>
                    </div>
                    <StatusPill label={`${(driversQuery.data || []).length}`} tone={(driversQuery.data || []).length ? "accent" : "muted"} />
                  </div>

                  {driversQuery.isLoading ? (
                    <div className="py-6">
                      <LoadingSpinner />
                    </div>
                  ) : driversQuery.isError ? (
                    <div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {nearbyDriversError}
                    </div>
                  ) : !(driversQuery.data || []).length ? (
                    <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Drivers close to your pickup will appear here.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(driversQuery.data || []).slice(0, 3).map((driver) => (
                        <div key={driver.riderId} className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={driver.driverName} size="md" />
                              <div>
                                <p className="font-semibold text-slate-950">{driver.driverName}</p>
                                <p className="text-xs text-slate-500">{driver.vehicleModel} • {driver.plateNumber}</p>
                              </div>
                            </div>
                            <p className="text-xs font-semibold text-slate-500">{driver.etaMinutes} min away</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-sm text-slate-500">{formatMoney(driver.estimatedPrice)}</div>
                            <Button
                              size="sm"
                              className="rounded-xl px-4"
                              disabled={!canRequestRide || requestRideMutation.isPending}
                              loading={requestRideMutation.isPending && requestingDriverId === driver.riderId}
                              onClick={() => requestDriver(driver.riderId)}
                            >
                              Request Driver
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Completed Trips</h3>
                      <p className="text-sm text-slate-500">Recent completed ride activity.</p>
                    </div>
                    <StatusPill label={`${completedRides.length}`} tone={completedRides.length ? "success" : "muted"} />
                  </div>

                  {!completedRides.length ? (
                    <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
                      No completed trips yet. Your trips will appear here.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedRides.slice(0, 2).map((ride) => (
                        <button
                          key={ride.id}
                          type="button"
                          onClick={() => setSelectedRide(ride)}
                          className="w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950">{ride.pickupAddress}</p>
                              <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
                            </div>
                            <Badge label="Completed" variant="success" size="sm" />
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-500">
                            <span>{formatMoney(ride.finalFare || ride.estimatedFare)}</span>
                            <span>{formatTimestamp(ride.completedAt || ride.requestedAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            ) : null}
          </div>

          {!isLargeScreen ? (
            <div className="space-y-4">
              <SectionCard className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-950">Where to?</h2>
                  <p className="mt-1 text-sm text-slate-500">Set pickup, dropoff, vehicle type, and payment method.</p>
                </div>
                {locationEditors}
                {plannerControls}
              </SectionCard>

              <SectionCard className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Nearby Drivers</h3>
                    <p className="text-sm text-slate-500">Drivers around your pickup appear here.</p>
                  </div>
                  <StatusPill label={`${(driversQuery.data || []).length} found`} tone={(driversQuery.data || []).length ? "accent" : "muted"} />
                </div>
                <NearbyDriversPanel
                  drivers={driversQuery.data || []}
                  isLoading={driversQuery.isLoading}
                  isError={driversQuery.isError}
                  errorMessage={nearbyDriversError}
                  canRequestRide={canRequestRide}
                  requestRideMutation={requestRideMutation}
                  requestingDriverId={requestingDriverId}
                  onRequestDriver={requestDriver}
                />
              </SectionCard>
            </div>
          ) : null}
        </>
      )}
    </div>
  );

  const tripsView = (
    <div className="grid gap-5 xl:grid-cols-2">
      <RideSummaryList
        title="Completed trips"
        rides={completedRides}
        emptyTitle="No completed trips yet"
        emptyDescription="Completed trips will appear here after your first successful ride."
        tone="success"
      />
      <RideSummaryList
        title="Cancelled or rejected"
        rides={cancelledRides}
        emptyTitle="Nothing cancelled"
        emptyDescription="Cancelled or rejected ride requests will appear here if they happen."
        tone="muted"
      />
    </div>
  );

  const paymentsView = (
    <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
      <FareSummaryCard
        estimateQuery={estimateQuery}
        estimatedFare={estimatedFare}
        estimatedTripDistanceKm={estimatedTripDistanceKm}
        directDistanceKm={directDistanceKm}
        distanceBufferKm={distanceBufferKm}
        distanceBufferPercent={distanceBufferPercent}
        quoteWarning={quoteWarning}
        hasBackendEstimate={hasBackendEstimate}
        showDetails={showFareDetails}
        onToggleDetails={() => setShowFareDetails((current) => !current)}
      />

      <SectionCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Payment options</h3>
          <p className="text-sm text-slate-500">Keep M-Pesa front and center, with cash as the secondary fallback.</p>
        </div>

        <PaymentMethodSelector
          value={form.paymentType}
          estimatedFare={hasBackendEstimate ? Number(estimatedFare) : null}
          estimatePending={estimateQuery.isFetching}
          onSelect={(paymentType) => setForm((current) => ({ ...current, paymentType }))}
        />

        {activeRide ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-950">Active ride payment</h4>
            <div className="mt-3 space-y-3">
              <DetailRow label="Ride" value={`#${activeRide.id}`} />
              <DetailRow label="Method" value={activeRide.paymentType} />
              <DetailRow label="Status" value={activeRide.paymentStatus} />
              <DetailRow label="Fare" value={formatMoney(activeRide.finalFare)} emphasis />
            </div>
            {["TRIP_STARTED", "PAYMENT_PENDING"].includes(activeRide.status) && activeRide.paymentType === "MPESA" && !activeRide.paymentApproved ? (
              <PrimaryActionButton className="mt-4 w-full" onClick={() => setPaymentRide(activeRide)}>
                Pay via M-Pesa
              </PrimaryActionButton>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
            No active ride payment yet. Your next booking will use the method selected above.
          </div>
        )}
      </SectionCard>
    </div>
  );

  const supportView = (
    <div className="grid gap-5 xl:grid-cols-[1fr,0.9fr]">
      <SectionCard className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Support</h3>
          <p className="text-sm text-slate-500">Messaging stays available through the floating support button at the bottom-right.</p>
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
          Need messaging? Use the floating support button to open tickets, follow replies, and continue the conversation without leaving this screen.
        </div>
      </SectionCard>

      <SectionCard>
        <h3 className="text-lg font-semibold text-slate-950">Current trip notes</h3>
        {!activeRide ? (
          <div className="mt-4">
            <EmptyState
              icon="🚕"
              title="No active ride"
              description="When you have an active ride, quick support details and ride context will appear here."
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <DetailRow label="Ride" value={`#${activeRide.id}`} />
              <div className="mt-3">
                <DetailRow label="Status" value={rideStatusLabel(activeRide.status)} emphasis />
              </div>
              <div className="mt-3">
                <DetailRow label="Driver" value={activeRide.riderName || "Matching driver"} />
              </div>
            </div>
            <Button variant="secondary" className="rounded-2xl" onClick={() => setActiveTab("ride")}>
              Return to live ride
            </Button>
          </div>
        )}
      </SectionCard>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fb] md:p-4">
      <div className="md:grid md:min-h-[calc(100vh-2rem)] md:grid-cols-[15rem,minmax(0,1fr)] md:gap-4">
        {isTabletUp ? (
          <aside className="md:flex md:flex-col md:rounded-[24px] md:border md:border-slate-200 md:bg-white md:p-5 md:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.22)]">
            <WorkspaceBrand subtitle="Customer" />

            <div className="mt-8 space-y-1.5">
              {CUSTOMER_NAV_ITEMS.map((item) => (
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
          {!isTabletUp ? (
            <div className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_30px_-28px_rgba(15,23,42,0.18)]">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                aria-label="Open menu"
              >
                <FiMenu className="text-lg" />
              </button>
              <WorkspaceBrand subtitle="Customer" />
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                <FiBell className="text-lg" />
              </span>
            </div>
          ) : null}

          {isTabletUp ? (
            <div className="md:flex md:items-center md:justify-between md:gap-4 md:rounded-[24px] md:border md:border-slate-200 md:bg-white md:px-5 md:py-4 md:shadow-[0_18px_34px_-28px_rgba(15,23,42,0.22)]">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300"
                aria-label="Open menu"
              >
                <FiMenu className="text-lg" />
              </button>

              <div className="flex items-center gap-3">
                <StatusPill
                  label={activeRide ? rideStatusLabel(activeRide.status) : "Kitui Town"}
                  tone={activeRide ? "accent" : "muted"}
                  hint={activeRide ? `Ride #${activeRide.id}` : `${(driversQuery.data || []).length} drivers nearby`}
                />
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                  <FiBell className="text-lg" />
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300"
                >
                  <Avatar name={customerName} size="sm" />
                  <span className="text-sm font-semibold text-slate-900">{customerName}</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
            {activeTab === "ride" ? rideHomeView : null}
            {activeTab === "trips" ? tripsView : null}
            {activeTab === "payments" ? paymentsView : null}
            {activeTab === "support" ? supportView : null}
          </div>
        </div>
      </div>

      <CustomerMenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        userName={customerName}
        supportPhone={supportPhone}
        activeRide={activeRide}
        nearbyDriversCount={(driversQuery.data || []).length}
        completedTripsCount={completedRides.length}
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
        participantName={activeRide?.riderName || rideChatThread?.participant?.fullName}
        participantPhone={activeRide?.riderPhone || rideChatThread?.participant?.phoneNumber}
        isLoading={rideChatQuery.isLoading}
        isError={rideChatQuery.isError}
        errorMessage="Unable to load the ride chat right now."
        placeholder={activeRide?.riderId
          ? "Preparing the ride chat for this trip."
          : "Ride chat opens once a driver accepts your request."}
        onActivity={() => {
          if (activeRide?.id) {
            queryClient.invalidateQueries({ queryKey: ["ride-chat-thread", "customer", activeRide.id] });
          }
        }}
      />

      {!isTabletUp ? <MobileBottomNav items={CUSTOMER_NAV_ITEMS} value={activeTab} onChange={handleNavChange} /> : null}

      {selectedRide ? (
        <Modal
          isOpen={Boolean(selectedRide)}
          title={`Ride #${selectedRide.id}`}
          onClose={() => setSelectedRide(null)}
        >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Status</p>
              <div className="mt-2">
                <Badge label={rideStatusLabel(selectedRide.status)} variant={rideStatusVariant(selectedRide.status)} size="sm" />
              </div>
            </div>
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
                <p className="text-sm text-slate-500">Fare</p>
                <p className="font-semibold text-slate-950">{formatMoney(selectedRide.finalFare)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <p className="font-semibold text-slate-950">{selectedRide.paymentType} • {selectedRide.paymentStatus}</p>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {paymentRide ? (
        <Modal
          isOpen={Boolean(paymentRide)}
          title="Pay with M-Pesa"
          onClose={() => setPaymentRide(null)}
          footer={(
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPaymentRide(null)}>
                Cancel
              </Button>
              <Button
                loading={mpesaMutation.isPending}
                onClick={() =>
                  mpesaMutation.mutate({
                    rideId: paymentRide.id,
                    phoneNumber,
                    manualDistanceKm: paymentRide.manualDistanceRequired ? paymentRide.chargeableDistanceKm : undefined
                  })
                }
              >
                Pay {formatMoney(paymentRide.finalFare)}
              </Button>
            </div>
          )}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Confirm the registered number below or enter the M-Pesa number you want to use. We will send an STK push, and the trip will close automatically after payment succeeds.
            </p>
            <Input
              label="M-Pesa phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
