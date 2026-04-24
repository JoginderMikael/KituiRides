import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSpinner,
  Modal,
  StatCard
} from "../components/UIComponents";
import RideMapbox from "../components/RideMapbox";
import {
  acceptDriverRide,
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
import { approveCashPayment } from "../features/rides/paymentApi";
import { getSupportContact } from "../features/support/supportApi";
import { useAuth } from "../hooks/useAuth";
import { connectRealtimeSocket } from "../lib/socket";
import { isActiveRide, isCompletedRide, rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function formatDistance(value) {
  return `${Number(value || 0).toFixed(2)} km`;
}

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selectedRide, setSelectedRide] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [manualDistance, setManualDistance] = useState("");

  const dashboardQuery = useQuery({ queryKey: ["driver-dashboard"], queryFn: getDriverDashboard });
  const ridesQuery = useQuery({ queryKey: ["driver-rides"], queryFn: getDriverRides });
  const offersQuery = useQuery({ queryKey: ["driver-offers"], queryFn: getDriverOffers });
  const supportContactQuery = useQuery({ queryKey: ["support-contact"], queryFn: getSupportContact });

  const rides = ridesQuery.data || [];
  const activeRide = rides.find((ride) => isActiveRide(ride.status)) || dashboardQuery.data?.activeTrip || null;
  const completedRides = rides.filter((ride) => isCompletedRide(ride.status));

  useEffect(() => {
    const disconnect = connectRealtimeSocket({
      userId: session?.userId,
      onRideUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["driver-rides"] });
        queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
      },
      onDriverOffer: () => queryClient.invalidateQueries({ queryKey: ["driver-offers"] })
    });
    return disconnect;
  }, [queryClient, session?.userId]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["driver-rides"] });
    queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
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
    onSuccess: () => {
      setManualDistance("");
      refresh();
    }
  });
  const cashMutation = useMutation({
    mutationFn: ({ rideId, manualDistanceKm }) => approveCashPayment(rideId, manualDistanceKm ? { manualDistanceKm } : {}),
    onSuccess: refresh
  });
  const completeMutation = useMutation({ mutationFn: completeDriverRide, onSuccess: refresh });
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

  const updateExactLocation = () => {
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
  };

  const currentActionCard = useMemo(() => {
    if (!activeRide) {
      return null;
    }
    if (activeRide.status === "DRIVER_ACCEPTED") {
      return {
        title: "Head to Pickup",
        description: "Mark arrival once you reach the customer pickup point.",
        action: (
          <Button onClick={() => arriveMutation.mutate(activeRide.id)} loading={arriveMutation.isPending}>
            Mark Arrived
          </Button>
        )
      };
    }
    if (activeRide.status === "DRIVER_ARRIVED") {
      return {
        title: "Start Trip",
        description: "Start the trip when the customer is on board.",
        action: (
          <Button variant="orange" onClick={() => startMutation.mutate(activeRide.id)} loading={startMutation.isPending}>
            Start Trip
          </Button>
        )
      };
    }
    if (activeRide.status === "TRIP_STARTED") {
      return {
        title: "Trip In Progress",
        description: activeRide.paymentType === "CASH"
          ? "Approve the cash payment once the customer pays you."
          : "Wait for the customer to complete M-Pesa payment after the trip.",
        action: activeRide.paymentType === "CASH" ? (
          <Button
            variant="success"
            onClick={() =>
              cashMutation.mutate({
                rideId: activeRide.id,
                manualDistanceKm: manualDistance ? Number(manualDistance) : undefined
              })
            }
            loading={cashMutation.isPending}
          >
            Approve Cash Payment
          </Button>
        ) : null
      };
    }
    if (activeRide.status === "PAYMENT_PENDING") {
      return {
        title: "Payment Pending",
        description: activeRide.paymentType === "MPESA"
          ? "The customer must finish the M-Pesa flow before the trip can close."
          : "Waiting for cash approval to finish settling the trip.",
        action: activeRide.paymentType === "CASH" && !activeRide.paymentApproved ? (
          <Button
            variant="success"
            onClick={() =>
              cashMutation.mutate({
                rideId: activeRide.id,
                manualDistanceKm: manualDistance ? Number(manualDistance) : undefined
              })
            }
            loading={cashMutation.isPending}
          >
            Approve Cash Payment
          </Button>
        ) : null
      };
    }
    if (activeRide.status === "PAYMENT_COMPLETED") {
      return {
        title: "Ready to Complete",
        description: "Payment is settled. Complete the trip to release the ride and update both dashboards.",
        action: (
          <Button variant="success" onClick={() => completeMutation.mutate(activeRide.id)} loading={completeMutation.isPending}>
            Complete Trip
          </Button>
        )
      };
    }
    if (activeRide.status === "DISPUTED") {
      return {
        title: "Ride Disputed",
        description: "Support is handling this ride. Use support chat or the hotline if more information is needed.",
        action: supportPhone ? (
          <a href={`tel:${supportPhone}`} className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
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

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Driver Dashboard</h1>
        <p className="mt-2 text-slate-600">Accept nearby offers, manage live trips, and keep commission balances healthy.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Status" value={dashboard?.online ? "Online" : "Offline"} icon={dashboard?.online ? "🟢" : "⚪"} />
        <StatCard label="Pending Offers" value={offersQuery.data?.length || 0} icon="📨" />
        <StatCard label="Wallet Balance" value={formatMoney(dashboard?.wallet?.balance)} icon="💰" />
        <StatCard label="Outstanding Commission" value={formatMoney(dashboard?.wallet?.outstandingCommission)} icon="🏦" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Availability</h2>
                <p className="text-sm text-slate-500">Only verified drivers can go online and receive ride offers.</p>
              </div>
              <Badge
                label={dashboard?.verified ? "Verified" : "Pending Approval"}
                variant={dashboard?.verified ? "success" : "warning"}
                size="sm"
              />
            </div>
            <Button
              className="w-full"
              variant={dashboard?.online ? "danger" : "primary"}
              onClick={() => statusMutation.mutate(!dashboard?.online)}
              loading={statusMutation.isPending}
            >
              {dashboard?.online ? "Go Offline" : "Go Online"}
            </Button>
            {dashboard?.vehicle && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{dashboard.vehicle.make} {dashboard.vehicle.model}</p>
                <p>{dashboard.vehicle.plateNumber} • {dashboard.vehicle.engineSize}cc</p>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Incoming Offers</h2>
                <p className="text-sm text-slate-500">Nearby ride requests are fanned out here in real time.</p>
              </div>
              <Badge label={`${offersQuery.data?.length || 0} offers`} variant="info" size="sm" />
            </div>

            {offersQuery.isLoading ? (
              <LoadingSpinner />
            ) : !(offersQuery.data || []).length ? (
              <EmptyState icon="🛰" title="No ride offers yet" description="Stay online and update your location to receive nearby requests." />
            ) : (
              <div className="space-y-3">
                {(offersQuery.data || []).map((offer) => (
                  <div key={offer.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Ride #{offer.rideId}</p>
                        <p className="text-sm text-slate-600">{offer.pickupAddress}</p>
                        <p className="text-sm text-slate-500">to {offer.dropoffAddress}</p>
                      </div>
                      <Badge label={`${formatMoney(offer.estimatedFare)}`} variant="teal" size="sm" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span>{offer.customerName}</span>
                      <span>{offer.customerPhone}</span>
                      <span>{offer.vehicleType}</span>
                      <span>{formatDistance(offer.estimatedDistanceKm)} trip</span>
                    </div>
                    {offer.pickupLat != null && offer.pickupLng != null && (
                      <div className="mt-4">
                        <RideMapbox
                          pickup={{ lat: offer.pickupLat, lng: offer.pickupLng }}
                          dropoff={{ lat: offer.dropoffLat, lng: offer.dropoffLng }}
                          customerLocation={{
                            lat: offer.pickupLat,
                            lng: offer.pickupLng,
                            label: offer.customerName
                          }}
                          driverLocation={driverMapLocation ? {
                            lat: Number(driverMapLocation.latitude),
                            lng: Number(driverMapLocation.longitude),
                            label: "You"
                          } : undefined}
                          heightClassName="h-56"
                          helperText="Customer pickup and your latest saved location are shown on the map."
                        />
                      </div>
                    )}
                    <div className="mt-4 flex gap-3">
                      <Button size="sm" onClick={() => acceptMutation.mutate(offer.rideId)} loading={acceptMutation.isPending}>
                        Accept
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => rejectMutation.mutate(offer.rideId)} loading={rejectMutation.isPending}>
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900">Location Update</h2>
            <Button
              className="mt-4 w-full"
              onClick={updateExactLocation}
              loading={locationMutation.isPending}
            >
              Update My Location
            </Button>
            {locationStatus && <p className="text-xs text-slate-500">{locationStatus}</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Current Trip</h2>
                <p className="text-sm text-slate-500">Active ride actions follow the strict Phase 3 state machine.</p>
              </div>
              {supportPhone && (
                <a href={`tel:${supportPhone}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                  Call support
                </a>
              )}
            </div>

            {!activeRide ? (
              <EmptyState icon="🚘" title="No active trip" description="Accept an incoming offer to begin a ride." />
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">Ride #{activeRide.id}</p>
                      <p className="font-semibold text-slate-900">{activeRide.pickupAddress}</p>
                      <p className="text-sm text-slate-500">to {activeRide.dropoffAddress}</p>
                    </div>
                    <Badge label={rideStatusLabel(activeRide.status)} variant={rideStatusVariant(activeRide.status)} size="sm" />
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <p>Customer: {activeRide.customerName}</p>
                    <p>Phone: {activeRide.customerPhone}</p>
                    <p>Fare: {formatMoney(activeRide.finalFare)}</p>
                    <p>Payment: {activeRide.paymentType}</p>
                    <p>Distance: {activeRide.chargeableDistanceKm || activeRide.estimatedDistanceKm || 0} km</p>
                    <p>Source: {activeRide.distanceSource}</p>
                  </div>
                  <div className="mt-4">
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
                      heightClassName="h-64"
                      helperText="Customer pickup and dropoff are shown here. Keep your location updated so the customer can see you."
                    />
                  </div>
                </div>

                {(activeRide.manualDistanceRequired || activeRide.status === "DISPUTED") && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                      GPS distance needs help. Submit manual KM if you have the final distance.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Input
                        label="Manual KM"
                        type="number"
                        value={manualDistance}
                        onChange={(event) => setManualDistance(event.target.value)}
                      />
                      <Button
                        variant="secondary"
                        onClick={() => distanceMutation.mutate({ rideId: activeRide.id, distanceKm: Number(manualDistance) })}
                        loading={distanceMutation.isPending}
                        disabled={!manualDistance}
                      >
                        Save Distance
                      </Button>
                    </div>
                  </div>
                )}

                {currentActionCard && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="font-semibold text-slate-900">{currentActionCard.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{currentActionCard.description}</p>
                    {currentActionCard.action && <div className="mt-4">{currentActionCard.action}</div>}
                  </div>
                )}

                <Button variant="secondary" onClick={() => setSelectedRide(activeRide)}>
                  View Trip Details
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Support Messaging</h2>
                <p className="text-sm text-slate-500">
                  Use the floating support button at the bottom right to open driver support tickets, review replies, and track thread status.
                </p>
              </div>
              {supportPhone && (
                <a href={`tel:${supportPhone}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                  Support hotline
                </a>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-slate-900">Completed Trips</h2>
            {completedRides.length === 0 ? (
              <EmptyState icon="🧾" title="No completed rides yet" description="Completed trips will build your earnings history here." />
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
        </div>
      </div>

      {selectedRide && (
        <Modal isOpen={Boolean(selectedRide)} title={`Ride #${selectedRide.id}`} onClose={() => setSelectedRide(null)}>
          <div className="space-y-4">
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
                <p className="text-sm text-slate-500">Customer</p>
                <p className="font-semibold text-slate-900">{selectedRide.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Payment</p>
                <p className="font-semibold text-slate-900">{selectedRide.paymentType} • {selectedRide.paymentStatus}</p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
