import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FiClock, FiCreditCard, FiHelpCircle, FiMapPin, FiMenu, FiPhone, FiUser } from "react-icons/fi";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import RideMapbox from "../components/RideMapbox";
import RideChatLauncher from "../components/RideChatLauncher";
import {
  AppHeader,
  BottomSheet,
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
  { value: "ride", label: "Ride", icon: FiMapPin },
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
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mapMode, setMapMode] = useState("pickup");
  const [activeTab, setActiveTab] = useState("ride");
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentRide, setPaymentRide] = useState(null);
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
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      setPaymentRide(null);
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

  const plannerForm = (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Pickup address"
          value={form.pickupAddress}
          onFocus={() => setMapMode("pickup")}
          onChange={(event) => setForm((current) => ({ ...current, pickupAddress: event.target.value }))}
          required
        />
        <Input
          label="Dropoff address"
          value={form.dropoffAddress}
          onFocus={() => setMapMode("dropoff")}
          onChange={(event) => setForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Vehicle type</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "CAR", label: "Car" },
              { value: "MOTORCYCLE", label: "Motorbike" }
            ].map((option) => {
              const active = form.vehicleType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, vehicleType: option.value }))}
                  className={`rounded-[22px] border px-4 py-3 text-sm font-semibold transition ${
                    active
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Best available fare</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {estimateQuery.isFetching
              ? "Calculating..."
              : hasBackendEstimate
                ? formatMoney(estimatedFare)
                : "Unavailable"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {hasBackendEstimate
              ? `${formatDistance(estimatedTripDistanceKm)} estimated trip distance`
              : "Your fare quote will appear as soon as the backend responds."}
          </p>
        </div>
      </div>

      <PaymentMethodSelector
        value={form.paymentType}
        estimatedFare={hasBackendEstimate ? Number(estimatedFare) : null}
        estimatePending={estimateQuery.isFetching}
        onSelect={(paymentType) => setForm((current) => ({ ...current, paymentType }))}
      />

      {!canRequestRide ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          You already have an active ride. Complete, resolve, or cancel it before requesting another one.
        </div>
      ) : null}

      <PrimaryActionButton
        className="w-full"
        onClick={handleMainRequestRide}
        disabled={!canRequestRide}
        loading={requestRideMutation.isPending && requestingDriverId == null}
      >
        {canRequestRide ? "Find Ride" : "Ride in Progress"}
      </PrimaryActionButton>
    </div>
  );

  const customerName = user ? `${user.firstName} ${user.lastName}` : session?.email || "Customer";

  const rideHomeView = (
    <div className="space-y-5">
      {activeRide ? (
        <SectionCard className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Live ride</p>
              <h2 className="text-xl font-semibold text-slate-950">{activeRide.pickupAddress}</h2>
              <p className="text-sm text-slate-500">to {activeRide.dropoffAddress}</p>
            </div>
            <Badge label={rideStatusLabel(activeRide.status)} variant={rideStatusVariant(activeRide.status)} size="sm" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="space-y-4">
              {activeRide.riderName ? (
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Driver info</p>
                  <p className="mt-2 font-semibold text-slate-950">{activeRide.riderName}</p>
                  <p className="text-sm text-slate-500">{activeRide.riderPhone}</p>
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  We are still matching you with a driver.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Payment</p>
                  <p className="mt-2 font-semibold text-slate-950">{activeRide.paymentType}</p>
                  <p className="text-sm text-slate-500">{activeRide.paymentStatus}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Trip total</p>
                  <p className="mt-2 font-semibold text-slate-950">{formatMoney(activeRide.finalFare)}</p>
                  <p className="text-sm text-slate-500">
                    {formatDistance(activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0)}
                  </p>
                </div>
              </div>

              {activeRide.status === "PAYMENT_PENDING" && activeRide.paymentType === "MPESA" && !activeRide.paymentApproved ? (
                <PrimaryActionButton className="w-full" onClick={() => setPaymentRide(activeRide)}>
                  Pay via M-Pesa
                </PrimaryActionButton>
              ) : null}

              {activeRide.status === "PAYMENT_PENDING" && activeRide.paymentType === "CASH" ? (
                <div className="rounded-[24px] border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                  Pay cash to the driver. The trip moves forward after the driver confirms the payment.
                </div>
              ) : null}

              {activeRide.manualDistanceRequired ? (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  GPS distance was incomplete. The driver or support must confirm final distance before payment can continue.
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {activeRide.status === "PAYMENT_COMPLETED" ? (
                  <Button
                    variant="success"
                    className="rounded-2xl"
                    onClick={() => completeRideMutation.mutate(activeRide.id)}
                    loading={completeRideMutation.isPending}
                  >
                    Complete Trip
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  className="rounded-2xl"
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
                  className="rounded-2xl"
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
                {supportPhone ? (
                  <a
                    href={`tel:${supportPhone}`}
                    className="inline-flex min-h-[2.75rem] items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Call Support
                  </a>
                ) : null}
                <Button variant="secondary" className="rounded-2xl" onClick={() => setSelectedRide(activeRide)}>
                  View Details
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Trip progress</p>
                <p className="mt-2 font-semibold text-slate-950">{rideStatusLabel(activeRide.status)}</p>
                <p className="text-sm text-slate-500">Ride #{activeRide.id}</p>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className={`grid gap-5 ${activeRide ? "" : "lg:grid-cols-[0.92fr,1.08fr] xl:grid-cols-[0.88fr,1.18fr,0.82fr]"}`}>
        {!activeRide ? (
          <div className="hidden space-y-5 lg:block">
            <SectionCard>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-950">Ride request</h2>
                <p className="text-sm text-slate-500">Pickup, dropoff, vehicle, payment, then one clear request action.</p>
              </div>
              {plannerForm}
            </SectionCard>
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
          </div>
        ) : null}

        <div className="space-y-5">
          <MapPanel
            title={activeRide ? "Trip map" : "Plan your ride"}
            subtitle={activeRide
              ? "Your route, driver position, and trip focus stay centered here."
              : "Pick on the map or type the addresses below."}
            controls={(
              <div className="flex items-center gap-2">
                {!activeRide ? (
                  <>
                    <Button
                      variant={mapMode === "pickup" ? "primary" : "secondary"}
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => setMapMode("pickup")}
                    >
                      Pickup
                    </Button>
                    <Button
                      variant={mapMode === "dropoff" ? "orange" : "secondary"}
                      size="sm"
                      className="rounded-2xl"
                      onClick={() => setMapMode("dropoff")}
                    >
                      Dropoff
                    </Button>
                  </>
                ) : null}
              </div>
            )}
            footer={(
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill
                  label={`Nearby drivers: ${(driversQuery.data || []).length}`}
                  tone={(driversQuery.data || []).length ? "accent" : "muted"}
                />
                {activeLocationStatus ? (
                  <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                    {activeLocationStatus}
                  </div>
                ) : null}
              </div>
            )}
          >
            <div className="relative">
              <RideMapbox
                pickup={{ lat: Number(activeRide?.pickupLat ?? form.pickupLat), lng: Number(activeRide?.pickupLng ?? form.pickupLng) }}
                dropoff={{ lat: Number(activeRide?.dropoffLat ?? form.dropoffLat), lng: Number(activeRide?.dropoffLng ?? form.dropoffLng) }}
                nearbyDrivers={activeRide ? [] : (driversQuery.data || [])}
                driverLocation={activeRide?.riderLat != null && activeRide?.riderLng != null ? {
                  lat: activeRide.riderLat,
                  lng: activeRide.riderLng,
                  label: activeRide.riderName
                } : undefined}
                activePoint={activeRide ? undefined : mapMode}
                onPointSelect={activeRide ? undefined : updatePointFromMap}
                heightClassName={activeRide ? "h-[24rem] md:h-[30rem]" : "h-[26rem] md:h-[32rem]"}
                helperText={activeRide
                  ? "Your assigned driver's latest location is shown on the route map."
                  : "Switch between pickup and dropoff, then click the map or a place label."}
              />

              {!activeRide ? (
                <div className="mt-4 lg:hidden">
                  <BottomSheet
                    title="Ride planning"
                    subtitle="Pickup, dropoff, vehicle, payment, and one main action."
                    summary={<StatusPill label={hasBackendEstimate ? formatMoney(estimatedFare) : "Quote pending"} tone="accent" />}
                    isOpen={plannerOpen}
                    onToggle={() => setPlannerOpen((current) => !current)}
                  >
                    {plannerForm}
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
                  </BottomSheet>
                </div>
              ) : null}
            </div>
          </MapPanel>
        </div>

        {!activeRide ? (
          <div className="space-y-5">
            <div className="lg:hidden">
              <BottomSheet
                title="Nearby drivers"
                subtitle={driversQuery.isError ? "We could not load nearby drivers." : "Drivers around your pickup appear here."}
                summary={<StatusPill label={`${(driversQuery.data || []).length} found`} tone={(driversQuery.data || []).length ? "info" : "muted"} />}
                isOpen={nearbySheetOpen}
                onToggle={() => setNearbySheetOpen((current) => !current)}
              >
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
              </BottomSheet>
            </div>

            <div className="hidden lg:block">
              <SectionCard className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Nearby drivers</h3>
                    <p className="text-sm text-slate-500">Compact list with live ETA and price estimate.</p>
                  </div>
                  <StatusPill label={`${(driversQuery.data || []).length} found`} tone={(driversQuery.data || []).length ? "info" : "muted"} />
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
          </div>
        ) : null}
      </div>
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
            {activeRide.status === "PAYMENT_PENDING" && activeRide.paymentType === "MPESA" && !activeRide.paymentApproved ? (
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
    <div className="space-y-5 pb-28 md:pb-8">
      <AppHeader
        eyebrow="KituiRides"
        title={activeRide ? "Your ride is live" : "Ready to book a ride?"}
        subtitle={activeRide
          ? "Driver details, payment status, and ride progress stay on the main screen while your trip is active."
          : (activeLocationStatus || "Use the map, then confirm pickup, dropoff, payment method, and request a ride.")}
        status={(
          <StatusPill
            label={activeRide ? rideStatusLabel(activeRide.status) : "Kitui Town"}
            tone={activeRide ? "accent" : "muted"}
            hint={activeRide ? `Ride #${activeRide.id}` : `${(driversQuery.data || []).length} drivers nearby`}
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
        {CUSTOMER_NAV_ITEMS.map((item) => {
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

      {activeTab === "ride" ? rideHomeView : null}
      {activeTab === "trips" ? tripsView : null}
      {activeTab === "payments" ? paymentsView : null}
      {activeTab === "support" ? supportView : null}

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

      <MobileBottomNav items={CUSTOMER_NAV_ITEMS} value={activeTab} onChange={handleNavChange} />

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
              We will trigger an STK Push to the number below. Trip completion stays locked until the callback succeeds.
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
