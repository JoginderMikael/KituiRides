import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner } from "../components/UIComponents";
import {
  fixRideKms,
  forceApprovePayment,
  getSupportRide,
  resolveRide,
  supportTickets,
} from "../features/support/supportApi";
import { rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [activeRideId, setActiveRideId] = useState(null);
  const [rideSearchId, setRideSearchId] = useState("");
  const [resolvedDistanceKm, setResolvedDistanceKm] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const ticketsQuery = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });

  const rideQuery = useQuery({
    queryKey: ["support-ride", activeRideId],
    queryFn: () => getSupportRide(activeRideId),
    enabled: Boolean(activeRideId)
  });

  const fixKmsMutation = useMutation({
    mutationFn: ({ rideId, kms }) => fixRideKms(rideId, kms),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-ride", activeRideId] })
  });

  const resolveRideMutation = useMutation({
    mutationFn: ({ rideId, payload }) => resolveRide(rideId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ride", activeRideId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setResolvedDistanceKm("");
      setResolutionNotes("");
    }
  });

  const forceApproveMutation = useMutation({
    mutationFn: forceApprovePayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-ride", activeRideId] })
  });

  const tickets = ticketsQuery.data || [];
  const stats = {
    total: tickets.length,
    disputes: tickets.filter((ticket) => ticket.ticketType === "DISPUTE").length,
    paymentConflicts: tickets.filter((ticket) => ticket.ticketType === "PAYMENT_CONFLICT").length,
    driverEditRequests: tickets.filter((ticket) => ticket.ticketType === "DRIVER_EDIT_REQUEST").length
  };

  const ride = rideQuery.data || null;
  const normalizedRideSearchId = rideSearchId.trim();
  const canSearchRide = normalizedRideSearchId && !Number.isNaN(Number(normalizedRideSearchId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Support Dashboard</h1>
        <p className="mt-2 text-slate-600">Resolve disputes, fix KM, settle payment conflicts, and coordinate through ride-linked support chat.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="text-center">
          <p className="text-sm text-slate-500">Open Queue</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="text-center bg-red-50">
          <p className="text-sm font-semibold text-red-700">Disputes</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{stats.disputes}</p>
        </Card>
        <Card className="text-center bg-amber-50">
          <p className="text-sm font-semibold text-amber-700">Payment Conflicts</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.paymentConflicts}</p>
        </Card>
        <Card className="text-center bg-blue-50">
          <p className="text-sm font-semibold text-blue-700">Driver Edit Requests</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.driverEditRequests}</p>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ride Investigation</h2>
              <p className="text-sm text-slate-500">Search any ride directly to inspect its lifecycle, payment state, and dispute details.</p>
            </div>
            <div className="flex gap-3">
              <Input
                label="Ride ID"
                value={rideSearchId}
                onChange={(event) => setRideSearchId(event.target.value)}
              />
              <Button
                onClick={() => setActiveRideId(Number(normalizedRideSearchId))}
                disabled={!canSearchRide}
              >
                Search Ride
              </Button>
            </div>
          </div>

          {!activeRideId ? (
            <div className="mt-4">
              <EmptyState icon="🔎" title="No ride selected" description="Search for a ride to inspect its lifecycle, distance, and payment state." />
            </div>
          ) : rideQuery.isLoading ? (
            <div className="mt-4"><LoadingSpinner /></div>
          ) : ride ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Ride #{ride.id}</p>
                    <p className="font-semibold text-slate-900">{ride.pickupAddress}</p>
                    <p className="text-sm text-slate-500">to {ride.dropoffAddress}</p>
                  </div>
                  <Badge label={rideStatusLabel(ride.status)} variant={rideStatusVariant(ride.status)} size="sm" />
                </div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <p>Customer: {ride.customerName}</p>
                  <p>Driver: {ride.riderName || "Unassigned"}</p>
                  <p>Fare: {formatMoney(ride.finalFare)}</p>
                  <p>Payment: {ride.paymentType} • {ride.paymentStatus}</p>
                  <p>Distance: {ride.chargeableDistanceKm || ride.estimatedDistanceKm || 0} km</p>
                  <p>Source: {ride.distanceSource}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white shadow-none">
                  <h3 className="text-lg font-semibold text-slate-900">Distance Override</h3>
                  <Input
                    label="Final Distance (KM)"
                    type="number"
                    value={resolvedDistanceKm}
                    onChange={(event) => setResolvedDistanceKm(event.target.value)}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fixKmsMutation.mutate({ rideId: ride.id, kms: Number(resolvedDistanceKm) })}
                    loading={fixKmsMutation.isPending}
                    disabled={!resolvedDistanceKm}
                  >
                    Update Distance
                  </Button>
                </Card>

                <Card className="bg-white shadow-none">
                  <h3 className="text-lg font-semibold text-slate-900">Resolve Dispute / Payment</h3>
                  <div className="space-y-3">
                    <Input
                      label="Resolved Distance (optional)"
                      type="number"
                      value={resolvedDistanceKm}
                      onChange={(event) => setResolvedDistanceKm(event.target.value)}
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Resolution Notes</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                        rows={3}
                        value={resolutionNotes}
                        onChange={(event) => setResolutionNotes(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() =>
                          resolveRideMutation.mutate({
                            rideId: ride.id,
                            payload: {
                              resolvedDistanceKm: resolvedDistanceKm ? Number(resolvedDistanceKm) : null,
                              resolutionNotes
                            }
                          })
                        }
                        loading={resolveRideMutation.isPending}
                      >
                        Resolve Ride
                      </Button>
                      {!ride.paymentApproved && (
                        <Button
                          variant="secondary"
                          onClick={() => forceApproveMutation.mutate(ride.id)}
                          loading={forceApproveMutation.isPending}
                        >
                          Force Approve Payment
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState icon="⚠" title="Ride not found" description="Check the ride ID and try again." />
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Support Messaging</h2>
              <p className="text-sm text-slate-500">
                Use the floating support launcher on the bottom right for customer and driver threads, and the bottom-left launcher for admin escalations.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
