import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ChatBox from "../components/ChatBox";
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Modal } from "../components/UIComponents";
import { getChatConversations } from "../features/chat/chatApi";
import {
  fixRideKms,
  forceApprovePayment,
  getSupportRide,
  replyTicket,
  resolveRide,
  supportTickets,
  updateTicket
} from "../features/support/supportApi";
import { rideStatusLabel, rideStatusVariant } from "../lib/rideStatus";

function formatMoney(value) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyByTicketId, setReplyByTicketId] = useState({});
  const [rideSearchId, setRideSearchId] = useState("");
  const [resolvedDistanceKm, setResolvedDistanceKm] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const ticketsQuery = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });
  const activeRideId = selectedTicket?.rideId;

  const rideQuery = useQuery({
    queryKey: ["support-ride", activeRideId],
    queryFn: () => getSupportRide(activeRideId),
    enabled: Boolean(activeRideId)
  });

  const conversationsQuery = useQuery({
    queryKey: ["chat-conversations", activeRideId],
    queryFn: () => getChatConversations({ rideId: activeRideId }),
    enabled: Boolean(activeRideId)
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

  const rideLookupMutation = useMutation({
    mutationFn: getSupportRide,
    onSuccess: (ride) => {
      setSelectedTicket((current) => (current ? { ...current, rideId: ride.id } : { id: null, rideId: ride.id, subject: `Ride #${ride.id}`, description: "Manual ride lookup" }));
    }
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

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }) => replyTicket(ticketId, { message }),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setReplyByTicketId((current) => ({ ...current, [ticketId]: "" }));
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status, resolutionNotes: notes }) => updateTicket(ticketId, { status, resolutionNotes: notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
  });

  const tickets = ticketsQuery.data || [];
  const stats = {
    total: tickets.length,
    disputes: tickets.filter((ticket) => ticket.ticketType === "DISPUTE").length,
    paymentConflicts: tickets.filter((ticket) => ticket.ticketType === "PAYMENT_CONFLICT").length,
    driverEditRequests: tickets.filter((ticket) => ticket.ticketType === "DRIVER_EDIT_REQUEST").length
  };

  const selectedConversation = (conversationsQuery.data || []).find((conversation) => conversation.id === selectedConversationId) || null;
  const ride = rideQuery.data || (activeRideId ? rideLookupMutation.data : null);

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

      <div className="grid gap-6 xl:grid-cols-[0.8fr,1.2fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Ticket Queue</h2>
              <p className="text-sm text-slate-500">Disputes, payment conflicts, and admin edit requests are handled here.</p>
            </div>
          </div>

          {ticketsQuery.isLoading ? (
            <LoadingSpinner />
          ) : !tickets.length ? (
            <EmptyState icon="📭" title="No tickets in queue" description="Support is caught up right now." />
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={`w-full rounded-2xl border px-4 py-4 text-left ${
                    selectedTicket?.id === ticket.id ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"
                  }`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">#{ticket.id} • {ticket.subject}</p>
                      <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
                    </div>
                    <Badge label={ticket.status} variant={ticket.status === "RESOLVED" ? "success" : ticket.status === "IN_PROGRESS" ? "warning" : "info"} size="sm" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge label={ticket.ticketType} variant="teal" size="sm" />
                    {ticket.rideId && <Badge label={`Ride ${ticket.rideId}`} variant="orange" size="sm" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Ride Investigation</h2>
                <p className="text-sm text-slate-500">Search any ride directly or inspect the ride linked to the selected ticket.</p>
              </div>
              <div className="flex gap-3">
                <Input
                  label="Ride ID"
                  value={rideSearchId}
                  onChange={(event) => setRideSearchId(event.target.value)}
                />
                <Button onClick={() => rideLookupMutation.mutate(Number(rideSearchId))} loading={rideLookupMutation.isPending}>
                  Search Ride
                </Button>
              </div>
            </div>

            {!selectedTicket && !rideLookupMutation.data ? (
              <div className="mt-4">
                <EmptyState icon="🔎" title="No ride selected" description="Choose a ticket or search for a ride to inspect its lifecycle, distance, and payment state." />
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

          {activeRideId && (
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Ride Chat</h2>
                  <p className="text-sm text-slate-500">Support can speak to the customer and driver in ride-linked support threads.</p>
                </div>
              </div>

              {conversationsQuery.isLoading ? (
                <div className="mt-4"><LoadingSpinner /></div>
              ) : !(conversationsQuery.data || []).length ? (
                <EmptyState icon="💬" title="No conversations for this ride" description="Support conversations are created when the ride is disputed or support joins the ride." />
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
                          <p className="font-semibold text-slate-900">{conversation.participantName}</p>
                          {conversation.unreadCount > 0 && (
                            <Badge label={`${conversation.unreadCount}`} variant="warning" size="sm" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{conversation.participantPhone}</p>
                      </button>
                    ))}
                  </div>
                  <ChatBox
                    conversationId={selectedConversation?.id}
                    title="Support Chat"
                    participantName={selectedConversation?.participantName}
                    participantPhone={selectedConversation?.participantPhone}
                    onActivity={() => queryClient.invalidateQueries({ queryKey: ["chat-conversations", activeRideId] })}
                  />
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

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
                  onClick={() => statusMutation.mutate({ ticketId: selectedTicket.id, status: "IN_PROGRESS", resolutionNotes })}
                  loading={statusMutation.isPending}
                >
                  Mark In Progress
                </Button>
              )}
              <Button
                onClick={() => statusMutation.mutate({ ticketId: selectedTicket.id, status: "RESOLVED", resolutionNotes })}
                loading={statusMutation.isPending}
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
                <Badge label={selectedTicket.ticketType} variant="teal" size="sm" />
              </div>
            </div>

            {!!selectedTicket.replies?.length && (
              <div className="space-y-3">
                {selectedTicket.replies.map((reply) => (
                  <div key={reply.id} className="rounded-2xl border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">User #{reply.authorUserId}</p>
                    <p className="mt-1 text-slate-600">{reply.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reply</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                rows={4}
                value={replyByTicketId[selectedTicket.id] || ""}
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
                value={resolutionNotes}
                onChange={(event) => setResolutionNotes(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => replyMutation.mutate({ ticketId: selectedTicket.id, message: replyByTicketId[selectedTicket.id] || "" })}
              loading={replyMutation.isPending}
            >
              Send Reply
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
