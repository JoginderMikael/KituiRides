import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  disputeRide,
  getCustomerRides,
  nearbyDrivers,
  requestRide
} from "../features/customer/customerApi";
import { initiateMpesaPayment } from "../features/rides/paymentApi";
import { getSupportContact } from "../features/support/supportApi";
import { useAuth } from "../hooks/useAuth";
import { apiClient, unwrap } from "../lib/apiClient";
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

export default function CustomerDashboard() {
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [mapMode, setMapMode] = useState("pickup");
  const [selectedRide, setSelectedRide] = useState(null);
  const [paymentRide, setPaymentRide] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState(toMpesaPhoneNumber(user?.phoneNumber || session?.phoneNumber || ""));

  useEffect(() => {
    setPhoneNumber((current) => current || toMpesaPhoneNumber(user?.phoneNumber || ""));
  }, [user?.phoneNumber]);

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
  const supportContactQuery = useQuery({
    queryKey: ["support-contact"],
    queryFn: getSupportContact
  });

  const rides = ridesQuery.data || [];
  const activeRide = rides.find((ride) => isActiveRide(ride.status)) || null;
  const completedRides = rides.filter((ride) => isCompletedRide(ride.status));
  const cancelledRides = rides.filter((ride) => isCancelledRide(ride.status) || ride.status === "DRIVER_REJECTED");

  useEffect(() => {
    const disconnect = connectRealtimeSocket({
      onRideUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
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

  const estimatedFare = driversQuery.data?.[0]?.estimatedPrice || 0;
  const supportPhone = supportContactQuery.data?.phoneNumber;
  const canRequestRide = !activeRide;

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
                Set Pickup
              </Button>
              <Button variant={mapMode === "dropoff" ? "orange" : "secondary"} size="sm" onClick={() => setMapMode("dropoff")}>
                Set Dropoff
              </Button>
            </div>
          </div>

          <RideMapbox
            pickup={{ lat: Number(form.pickupLat), lng: Number(form.pickupLng) }}
            dropoff={{ lat: Number(form.dropoffLat), lng: Number(form.dropoffLng) }}
            nearbyDrivers={driversQuery.data || []}
            activePoint={mapMode}
            onPointSelect={(point, coordinates) => {
              if (point === "pickup") {
                setForm((current) => ({ ...current, pickupLat: coordinates.lat, pickupLng: coordinates.lng }));
              } else {
                setForm((current) => ({ ...current, dropoffLat: coordinates.lat, dropoffLng: coordinates.lng }));
              }
            }}
          />

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
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
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Pickup Address"
                value={form.pickupAddress}
                onChange={(event) => setForm((current) => ({ ...current, pickupAddress: event.target.value }))}
                required
              />
              <Input
                label="Dropoff Address"
                value={form.dropoffAddress}
                onChange={(event) => setForm((current) => ({ ...current, dropoffAddress: event.target.value }))}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
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
              <Input
                label="Pickup Lat"
                type="number"
                value={form.pickupLat}
                onChange={(event) => setForm((current) => ({ ...current, pickupLat: event.target.value }))}
              />
              <Input
                label="Pickup Lng"
                type="number"
                value={form.pickupLng}
                onChange={(event) => setForm((current) => ({ ...current, pickupLng: event.target.value }))}
              />
              <Input
                label="Dropoff Lat"
                type="number"
                value={form.dropoffLat}
                onChange={(event) => setForm((current) => ({ ...current, dropoffLat: event.target.value }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Dropoff Lng"
                type="number"
                value={form.dropoffLng}
                onChange={(event) => setForm((current) => ({ ...current, dropoffLng: event.target.value }))}
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Estimated Fare</p>
                <p className="mt-1 text-2xl font-bold text-orange-600">{formatMoney(estimatedFare)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Based on the closest available {form.vehicleType === "CAR" ? "car" : "motorcycle"} drivers.
                </p>
              </div>
            </div>

            <PaymentMethodSelector
              estimatedFare={Number(estimatedFare || 0)}
              onSelect={(paymentType) => setForm((current) => ({ ...current, paymentType }))}
            />

            {!canRequestRide && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                You already have an active ride. Complete, resolve, or cancel it before requesting another one.
              </div>
            )}

            <Button className="w-full" size="lg" loading={requestRideMutation.isPending} disabled={!canRequestRide}>
              Request Ride
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nearby Drivers</h2>
              <Badge label={`${driversQuery.data?.length || 0} found`} variant="info" size="sm" />
            </div>

            {driversQuery.isLoading ? (
              <LoadingSpinner />
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

                <div className="flex flex-wrap gap-3">
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
