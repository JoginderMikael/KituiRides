import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ChatBox from "../components/ChatBox";
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
import { getChatConversations } from "../features/chat/chatApi";
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

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selectedRide, setSelectedRide] = useState(null);
  const [locationInput, setLocationInput] = useState({ latitude: "-1.3760", longitude: "38.0100" });
  const [manualDistance, setManualDistance] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const dashboardQuery = useQuery({ queryKey: ["driver-dashboard"], queryFn: getDriverDashboard });
  const ridesQuery = useQuery({ queryKey: ["driver-rides"], queryFn: getDriverRides });
  const offersQuery = useQuery({ queryKey: ["driver-offers"], queryFn: getDriverOffers });
  const supportContactQuery = useQuery({ queryKey: ["support-contact"], queryFn: getSupportContact });

  const rides = ridesQuery.data || [];
  const activeRide = rides.find((ride) => isActiveRide(ride.status)) || dashboardQuery.data?.activeTrip || null;
  const completedRides = rides.filter((ride) => isCompletedRide(ride.status));

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations", activeRide?.id],
    queryFn: () => getChatConversations({ rideId: activeRide.id }),
    enabled: Boolean(activeRide?.id)
  });

  useEffect(() => {
    const conversations = conversationsQuery.data || [];
    if (!conversations.length) {
      setSelectedConversationId(null);
      return;
    }
    if (!selectedConversationId || !conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversationsQuery.data, selectedConversationId]);

  useEffect(() => {
    const disconnect = connectRealtimeSocket({
      userId: session?.userId,
      conversationIds: (conversationsQuery.data || []).map((conversation) => conversation.id),
      onRideUpdate: () => {
        queryClient.invalidateQueries({ queryKey: ["driver-rides"] });
        queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
      },
      onDriverOffer: () => queryClient.invalidateQueries({ queryKey: ["driver-offers"] }),
      onConversationUpdate: () => {
        if (activeRide?.id) {
          queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeRide.id] });
        }
      }
    });
    return disconnect;
  }, [activeRide?.id, conversationsQuery.data, queryClient, session?.userId]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["driver-rides"] });
    queryClient.invalidateQueries({ queryKey: ["driver-offers"] });
    if (activeRide?.id) {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeRide.id] });
    }
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
  const locationMutation = useMutation({ mutationFn: updateDriverLocation, onSuccess: refresh });

  const dashboard = dashboardQuery.data;
  const supportPhone = supportContactQuery.data?.phoneNumber || dashboard?.supportPhoneNumber;
  const selectedConversation = (conversationsQuery.data || []).find((conversation) => conversation.id === selectedConversationId) || null;

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
                  <div key={offer.offerId} className="rounded-2xl border border-slate-200 p-4">
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
                    </div>
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
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Input
                label="Latitude"
                type="number"
                value={locationInput.latitude}
                onChange={(event) => setLocationInput((current) => ({ ...current, latitude: event.target.value }))}
              />
              <Input
                label="Longitude"
                type="number"
                value={locationInput.longitude}
                onChange={(event) => setLocationInput((current) => ({ ...current, longitude: event.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => locationMutation.mutate({
                latitude: Number(locationInput.latitude),
                longitude: Number(locationInput.longitude)
              })}
              loading={locationMutation.isPending}
            >
              Update My Location
            </Button>
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

          {activeRide && (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Live Chat</h2>
                  <p className="text-sm text-slate-500">Use ride chat with the customer or support chat during disputes.</p>
                </div>
                {supportPhone && (
                  <a href={`tel:${supportPhone}`} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
                    Support hotline
                  </a>
                )}
              </div>

              {conversationsQuery.isLoading ? (
                <div className="mt-4"><LoadingSpinner /></div>
              ) : !(conversationsQuery.data || []).length ? (
                <EmptyState icon="💬" title="No chat open yet" description="Ride chat becomes available once you accept a trip. Support chat appears during disputes." />
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-[0.35fr,0.65fr]">
                  <div className="space-y-3">
                    {(conversationsQuery.data || []).map((conversation) => (
                      <button
                        key={conversation.id}
                        className={`w-full rounded-2xl border px-4 py-3 text-left ${
                          conversation.id === selectedConversationId
                            ? "border-teal-500 bg-teal-50"
                            : "border-slate-200 bg-white"
                        }`}
                        onClick={() => setSelectedConversationId(conversation.id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-slate-900">
                            {conversation.conversationType === "RIDE_CHAT" ? "Customer" : "Support"}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge label={`${conversation.unreadCount}`} variant="warning" size="sm" />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{conversation.participantName}</p>
                        <p className="text-xs text-slate-500">{conversation.participantPhone}</p>
                      </button>
                    ))}
                  </div>
                  <ChatBox
                    conversationId={selectedConversation?.id}
                    title={selectedConversation?.conversationType === "RIDE_CHAT" ? "Customer Chat" : "Support Chat"}
                    participantName={selectedConversation?.participantName}
                    participantPhone={selectedConversation?.participantPhone}
                    onActivity={() => queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeRide.id] })}
                  />
                </div>
              )}
            </Card>
          )}

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
