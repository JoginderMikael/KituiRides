import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ChatBox from "../components/ChatBox";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import RideMapbox from "../components/RideMapbox";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
  StatCard
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

export default function CustomerDashboard() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mapMode, setMapMode] = useState("pickup");
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentRide, setPaymentRide] = useState(null);
  const [requestingDriverId, setRequestingDriverId] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(toMpesaPhoneNumber(user?.phoneNumber || session?.phoneNumber || ""));
  const [locationStatus, setLocationStatus] = useState("");
  const [pickupSearchStatus, setPickupSearchStatus] = useState("");
  const [dropoffSearchStatus, setDropoffSearchStatus] = useState("");
  const lastGeocodedPickupRef = useRef("");
  const lastGeocodedDropoffRef = useRef("");
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

  const requestDriver = (driverId) => {
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Request a Ride</h1>
        <p className="mt-2 text-slate-600">Book a car or motorcycle, pay the right way, and stay connected through the trip.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Ride" value={activeRide ? "1" : "0"} icon="🚗" />
        <StatCard label="Nearby Drivers" value={driversQuery.data?.length || 0} icon="📍" />
        <StatCard label="Completed Trips" value={completedRides.length} icon="✓" />
        <StatCard label="Support" value={supportPhone || "Pending"} icon="☎" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.9fr]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Plan Your Ride</h2>
              <p className="text-sm text-slate-500">Use the map or the fields below to set pickup and dropoff.</p>
            </div>
            <div className="flex gap-2">
              <Button variant={mapMode === "pickup" ? "primary" : "secondary"} size="sm" onClick={() => setMapMode("pickup")}>
                Pickup
              </Button>
              <Button variant={mapMode === "dropoff" ? "orange" : "secondary"} size="sm" onClick={() => setMapMode("dropoff")}>
                Dropoff
              </Button>
            </div>
          </div>

          <RideMapbox
            pickup={{ lat: Number(form.pickupLat), lng: Number(form.pickupLng) }}
            dropoff={{ lat: Number(form.dropoffLat), lng: Number(form.dropoffLng) }}
            nearbyDrivers={driversQuery.data || []}
            activePoint={mapMode}
            onPointSelect={updatePointFromMap}
            helperText="Choose Pickup or Dropoff, then click anywhere on the map or on a place label. You can also type either address."
          />
          {activeLocationStatus && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {activeLocationStatus}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Pickup Address"
                value={form.pickupAddress}
                onFocus={() => setMapMode("pickup")}
                onChange={(event) => setForm((current) => ({ ...current, pickupAddress: event.target.value }))}
                required
              />
              <Input
                label="Dropoff Address"
                value={form.dropoffAddress}
                onFocus={() => setMapMode("dropoff")}
                onChange={(event) => setForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr),minmax(0,1.2fr)]">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle Type</label>
                <select
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  value={form.vehicleType}
                  onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}
                >
                  <option value="CAR">Car</option>
                  <option value="MOTORCYCLE">Motorcycle</option>
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Best Available Fare</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {estimateQuery.isFetching
                    ? "Calculating..."
                    : hasBackendEstimate
                      ? formatMoney(estimatedFare)
                      : "Unavailable"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Estimated trip distance: {hasBackendEstimate ? formatDistance(estimatedTripDistanceKm) : "Calculating..."}. Driver-specific request prices are shown in the nearby driver list below.
                </p>
                {hasBackendEstimate && directDistanceKm > 0 && distanceBufferKm > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Backend distance: {formatDistance(directDistanceKm)} + {distanceBufferPercent}% buffer ({formatDistance(distanceBufferKm)}).
                  </p>
                )}
                {estimateQuery.data?.pricingBasis && (
                  <p className="mt-1 text-xs text-slate-400">
                    Quote basis: {estimateQuery.data.pricingBasis}.
                  </p>
                )}
                {quoteWarning && (
                  <p className="mt-1 text-xs text-amber-700">
                    {quoteWarning}
                  </p>
                )}
              </div>
            </div>

            <PaymentMethodSelector
              estimatedFare={hasBackendEstimate ? Number(estimatedFare) : null}
              estimatePending={estimateQuery.isFetching}
              onSelect={(paymentType) => setForm((current) => ({ ...current, paymentType }))}
            />

            {!canRequestRide && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                You already have an active ride. Complete, resolve, or cancel it before requesting another one.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nearby Drivers</h2>
              <Badge label={`${driversQuery.data?.length || 0} found`} variant="info" size="sm" />
            </div>

            {driversQuery.isLoading ? (
              <LoadingSpinner />
            ) : driversQuery.isError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {nearbyDriversError}
              </div>
            ) : (driversQuery.data || []).length === 0 ? (
              <EmptyState icon="🧭" title="No Drivers Nearby" description="Try adjusting your pickup or wait for more drivers to come online." />
            ) : (
              <div className="space-y-3">
                {(driversQuery.data || []).map((driver) => (
                  <div key={driver.riderId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={driver.driverName} size="md" />
                        <div>
                          <p className="font-semibold text-slate-900">{driver.driverName}</p>
                          <p className="text-sm text-slate-500">{driver.vehicleModel} • {driver.plateNumber}</p>
                        </div>
                      </div>
                      <Badge label={`${driver.etaMinutes} min`} variant="teal" size="sm" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <p>Distance: {driver.distanceToPickupKm} km</p>
                      <p>Estimate: {formatMoney(driver.estimatedPrice)}</p>
                    </div>
                    <Button
                      className="mt-4 w-full"
                      disabled={!canRequestRide || requestRideMutation.isPending}
                      loading={requestRideMutation.isPending && requestingDriverId === driver.riderId}
                      onClick={() => requestDriver(driver.riderId)}
                    >
                      Request Driver
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900">Live Ride</h2>
            {ridesQuery.isLoading ? (
              <div className="mt-4"><LoadingSpinner /></div>
            ) : !activeRide ? (
              <EmptyState icon="🚕" title="No Active Ride" description="Your current trip status and payment actions will show here." />
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Ride #{activeRide.id}</p>
                      <p className="font-semibold text-slate-900">{activeRide.pickupAddress}</p>
                      <p className="text-sm text-slate-600">to {activeRide.dropoffAddress}</p>
                    </div>
                    <Badge label={rideStatusLabel(activeRide.status)} variant={rideStatusVariant(activeRide.status)} size="sm" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <p>Payment: {activeRide.paymentType}</p>
                    <p>Fare: {formatMoney(activeRide.finalFare)}</p>
                    <p>Distance: {activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0} km</p>
                    <p>Source: {activeRide.distanceSource}</p>
                  </div>
                  {activeRide.riderName && (
                    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                      <p className="font-semibold text-slate-900">Driver Assigned</p>
                      <p className="text-sm text-slate-600">{activeRide.riderName}</p>
                      <p className="text-sm text-slate-500">{activeRide.riderPhone}</p>
                    </div>
                  )}
                  {activeRide.riderLat != null && activeRide.riderLng != null && (
                    <div className="mt-4">
                      <RideMapbox
                        pickup={{ lat: activeRide.pickupLat, lng: activeRide.pickupLng }}
                        dropoff={{ lat: activeRide.dropoffLat, lng: activeRide.dropoffLng }}
                        driverLocation={{
                          lat: activeRide.riderLat,
                          lng: activeRide.riderLng,
                          label: activeRide.riderName
                        }}
                        heightClassName="h-64"
                        helperText="Your assigned driver's latest location is shown with the driver marker."
                      />
                    </div>
                  )}
                </div>

                {activeRide.status === "PAYMENT_PENDING" && activeRide.paymentType === "MPESA" && !activeRide.paymentApproved && (
                  <Button className="w-full" onClick={() => setPaymentRide(activeRide)}>
                    Pay via M-Pesa
                  </Button>
                )}

                {activeRide.status === "PAYMENT_PENDING" && activeRide.paymentType === "CASH" && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    Pay cash to the driver. The trip will move forward after the driver approves the payment.
                  </div>
                )}

                {activeRide.manualDistanceRequired && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    GPS distance was incomplete. The driver must submit manual KM or support must resolve the final distance before payment can continue.
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">Ride Chat</p>
                      <p className="text-sm text-slate-500">Talk directly with your assigned driver under this ride.</p>
                    </div>
                    {rideChatThread && <Badge label="Open" variant="teal" size="sm" />}
                  </div>
                  {rideChatQuery.isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : rideChatQuery.isError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Unable to load the ride chat right now.
                    </div>
                  ) : rideChatThread ? (
                    <ChatBox
                      conversationId={rideChatThread.id}
                      title={`Ride #${activeRide.id} chat`}
                      participantName={activeRide.riderName || rideChatThread.participant?.fullName}
                      participantPhone={activeRide.riderPhone || rideChatThread.participant?.phoneNumber}
                      onActivity={() => queryClient.invalidateQueries({ queryKey: ["ride-chat-thread", "customer", activeRide.id] })}
                    />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      {activeRide.riderId
                        ? "Preparing the ride chat for this trip."
                        : "Ride chat opens once a driver accepts your request."}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {activeRide.status === "PAYMENT_COMPLETED" && (
                    <Button
                      variant="success"
                      onClick={() => completeRideMutation.mutate(activeRide.id)}
                      loading={completeRideMutation.isPending}
                    >
                      Complete Trip
                    </Button>
                  )}
                  <Button
                    variant="outline"
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
                  {supportPhone && (
                    <a href={`tel:${supportPhone}`} className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      Call Support
                    </a>
                  )}
                  <Button variant="secondary" onClick={() => setSelectedRide(activeRide)}>
                    View Details
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Support Messaging</h2>
            <p className="text-sm text-slate-500">
              Use the floating support button at the bottom right to open tickets, follow threads, and reply with full timestamps and status tracking.
            </p>
          </div>
          {supportPhone && (
            <a href={`tel:${supportPhone}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
              Call support: {supportPhone}
            </a>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-slate-900">Completed Trips</h2>
          {completedRides.length === 0 ? (
            <EmptyState icon="🛣" title="No completed trips yet" description="Your completed rides will appear here." />
          ) : (
            <div className="mt-4 space-y-3">
              {completedRides.map((ride) => (
                <div key={ride.id} className="rounded-2xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{ride.pickupAddress} to {ride.dropoffAddress}</p>
                      <p className="text-sm text-slate-600">{formatMoney(ride.finalFare)}</p>
                    </div>
                    <Badge label="Completed" variant="success" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-900">Cancelled / Rejected</h2>
          {cancelledRides.length === 0 ? (
            <EmptyState icon="🧾" title="No cancelled rides" description="Cancelled or rejected requests will appear here." />
          ) : (
            <div className="mt-4 space-y-3">
              {cancelledRides.map((ride) => (
                <div key={ride.id} className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{ride.pickupAddress} to {ride.dropoffAddress}</p>
                      <p className="text-sm text-slate-600">{rideStatusLabel(ride.status)}</p>
                    </div>
                    <Badge label={rideStatusLabel(ride.status)} variant="error" size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedRide && (
        <Modal
          isOpen={Boolean(selectedRide)}
          title={`Ride #${selectedRide.id}`}
          onClose={() => setSelectedRide(null)}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Status</p>
              <Badge label={rideStatusLabel(selectedRide.status)} variant={rideStatusVariant(selectedRide.status)} size="sm" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Pickup</p>
                <p className="font-semibold text-slate-900">{selectedRide.pickupAddress}</p>
                <p className="text-xs text-slate-500">{selectedRide.pickupLat}, {selectedRide.pickupLng}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Dropoff</p>
                <p className="font-semibold text-slate-900">{selectedRide.dropoffAddress}</p>
                <p className="text-xs text-slate-500">{selectedRide.dropoffLat}, {selectedRide.dropoffLng}</p>
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

      {paymentRide && (
        <Modal
          isOpen={Boolean(paymentRide)}
          title="Pay with M-Pesa"
          onClose={() => setPaymentRide(null)}
          footer={
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
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              We’ll trigger an STK Push to the number below. Trip completion stays locked until the payment callback succeeds.
            </p>
            <Input
              label="M-Pesa Phone Number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
