import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { replyTicket, supportTickets, updateTicket } from "../features/support/supportApi";
import { apiClient, unwrap } from "../lib/apiClient";
import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  Modal,
  EmptyState,
} from "../components/UIComponents";

export default function SupportPage() {
  const [replyByTicketId, setReplyByTicketId] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [rideSearchId, setRideSearchId] = useState("");
  const [searchedRide, setSearchedRide] = useState(null);
  const [newKms, setNewKms] = useState("");
  const queryClient = useQueryClient();

  const tickets = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });

  const searchRideMutation = useMutation({
    mutationFn: async (rideId) => {
      return unwrap(apiClient.get(`/rides/${rideId}`));
    },
    onSuccess: (data) => {
      setSearchedRide(data);
    }
  });

  const fixKmsMutation = useMutation({
    mutationFn: async ({ rideId, kms }) => {
      return unwrap(apiClient.patch(`/support/rides/${rideId}/kms?kms=${kms}`));
    },
    onSuccess: (data) => {
      setSearchedRide(data);
      alert("KMs updated successfully");
    }
  });

  const forceApproveMutation = useMutation({
    mutationFn: async (rideId) => {
      return unwrap(apiClient.post(`/support/rides/${rideId}/approve-payment`));
    },
    onSuccess: (data) => {
      setSearchedRide(data);
      alert("Payment force-approved successfully");
    }
  });

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }) => replyTicket(ticketId, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setReplyByTicketId((prev) => ({ ...prev, [selectedTicket?.id]: "" }));
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status }) => updateTicket(ticketId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setSelectedTicket(null);
    }
  });

  const allTickets = tickets.data || [];
  const filteredTickets =
    filterStatus === "ALL"
      ? allTickets
      : allTickets.filter((t) => t.status === filterStatus);

  const stats = {
    total: allTickets.length,
    open: allTickets.filter((t) => t.status === "OPEN").length,
    inProgress: allTickets.filter((t) => t.status === "IN_PROGRESS").length,
    resolved: allTickets.filter((t) => t.status === "RESOLVED").length,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "OPEN":
        return "error";
      case "IN_PROGRESS":
        return "warning";
      case "RESOLVED":
        return "success";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Support Tickets</h1>
        <p className="text-gray-600">Manage and respond to customer support requests</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-gray-600 text-sm">Total Tickets</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total}</p>
        </Card>
        <Card className="text-center bg-red-50 border-l-4 border-l-red-500">
          <p className="text-red-700 text-sm font-semibold">Open</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.open}</p>
        </Card>
        <Card className="text-center bg-yellow-50 border-l-4 border-l-yellow-500">
          <p className="text-yellow-700 text-sm font-semibold">In Progress</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.inProgress}</p>
        </Card>
        <Card className="text-center bg-green-50 border-l-4 border-l-green-500">
          <p className="text-green-700 text-sm font-semibold">Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</p>
        </Card>
      </div>

      {/* Ride Conflict Resolution */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Ride Conflict Resolution</h2>
        <div className="flex gap-3 mb-4">
          <Input 
            placeholder="Enter Ride ID (e.g. 1)" 
            value={rideSearchId} 
            onChange={e => setRideSearchId(e.target.value)} 
          />
          <Button onClick={() => searchRideMutation.mutate(rideSearchId)} loading={searchRideMutation.isPending}>Search Ride</Button>
        </div>

        {searchedRide && (
          <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="flex justify-between">
              <div>
                <p className="font-bold">Ride #{searchedRide.id}</p>
                <p className="text-sm">{searchedRide.pickupAddress} → {searchedRide.dropoffAddress}</p>
              </div>
              <Badge label={searchedRide.status} variant="info" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p><strong>Distance:</strong> {searchedRide.distanceKm} KM</p>
              <p><strong>Fare:</strong> KES {searchedRide.finalFare}</p>
              <p><strong>Payment:</strong> {searchedRide.paymentApproved ? "Approved ✓" : "Pending ⏳"}</p>
            </div>
            
            <div className="pt-3 border-t flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-bold mb-1">Fix Distance (KM)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    className="px-2 py-1 border rounded w-24 text-sm" 
                    value={newKms} 
                    onChange={e => setNewKms(e.target.value)} 
                  />
                  <Button size="sm" variant="warning" onClick={() => fixKmsMutation.mutate({ rideId: searchedRide.id, kms: newKms })} loading={fixKmsMutation.isPending}>Update KM</Button>
                </div>
              </div>
              {!searchedRide.paymentApproved && (
                <Button size="sm" variant="success" onClick={() => forceApproveMutation.mutate(searchedRide.id)} loading={forceApproveMutation.isPending}>Force Approve Payment</Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "primary" : "secondary"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === "IN_PROGRESS" ? "In Progress" : status}
          </Button>
        ))}
      </div>

      {/* Tickets List */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {filterStatus === "ALL"
            ? "All Tickets"
            : `${filterStatus} Tickets`} ({filteredTickets.length})
        </h2>

        {tickets.isLoading ? (
          <LoadingSpinner />
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            icon="📭"
            title={
              filterStatus === "ALL"
                ? "No Tickets Yet"
                : `No ${filterStatus} Tickets`
            }
            description="You're all caught up! There are no support tickets to handle."
          />
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`p-4 border-l-4 rounded-lg cursor-pointer hover:bg-gray-50 transition ${
                  ticket.status === "OPEN"
                    ? "border-l-red-500 bg-red-50"
                    : ticket.status === "IN_PROGRESS"
                    ? "border-l-yellow-500 bg-yellow-50"
                    : "border-l-green-500 bg-green-50"
                }`}
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-800">#{ticket.id}</p>
                      <Badge
                        label={ticket.status}
                        variant={getStatusColor(ticket.status)}
                        size="sm"
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {ticket.subject}
                    </h3>
                  </div>
                </div>

                <p className="text-gray-700 mb-2">{ticket.description}</p>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {ticket.replies?.length || 0} replies
                  </p>
                  <Button variant="secondary" size="sm">
                    View Details →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal
          isOpen={!!selectedTicket}
          title={`Ticket #${selectedTicket.id} - ${selectedTicket.subject}`}
          onClose={() => setSelectedTicket(null)}
          size="lg"
          footer={
            <div className="flex gap-3 justify-end">
              {selectedTicket.status !== "RESOLVED" && (
                <>
                  {selectedTicket.status === "OPEN" && (
                    <Button
                      variant="warning"
                      onClick={() =>
                        statusMutation.mutate({
                          ticketId: selectedTicket.id,
                          status: "IN_PROGRESS"
                        })
                      }
                      loading={statusMutation.isPending}
                    >
                      Mark In Progress
                    </Button>
                  )}
                  <Button
                    variant="success"
                    onClick={() =>
                      statusMutation.mutate({
                        ticketId: selectedTicket.id,
                        status: "RESOLVED"
                      })
                    }
                    loading={statusMutation.isPending}
                  >
                    Mark Resolved ✓
                  </Button>
                </>
              )}
            </div>
          }
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Ticket Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-600 text-sm mb-1">Status</p>
              <Badge
                label={selectedTicket.status}
                variant={getStatusColor(selectedTicket.status)}
                size="md"
              />
            </div>

            {/* Customer Issue */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Issue Description</h4>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-gray-800">{selectedTicket.description}</p>
              </div>
            </div>

            {/* Conversation Thread */}
            {selectedTicket.replies && selectedTicket.replies.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  Conversation ({selectedTicket.replies.length} messages)
                </h4>
                <div className="space-y-3">
                  {selectedTicket.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="p-3 bg-gray-100 rounded-lg text-sm"
                    >
                      <p className="font-semibold text-gray-700 mb-1">
                        User #{reply.authorUserId}
                      </p>
                      <p className="text-gray-800">{reply.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Form */}
            {selectedTicket.status !== "RESOLVED" && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Send Reply</h4>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  rows={4}
                  placeholder="Type your response to the customer..."
                  value={replyByTicketId[selectedTicket.id] || ""}
                  onChange={(e) =>
                    setReplyByTicketId({
                      ...replyByTicketId,
                      [selectedTicket.id]: e.target.value
                    })
                  }
                />
                <Button
                  className="mt-3 w-full"
                  onClick={() =>
                    replyMutation.mutate({
                      ticketId: selectedTicket.id,
                      message: replyByTicketId[selectedTicket.id] || ""
                    })
                  }
                  loading={replyMutation.isPending}
                >
                  Send Reply
                </Button>
              </div>
            )}

            {selectedTicket.status === "RESOLVED" && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-green-700 font-semibold">✓ This ticket has been resolved</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
