import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createCustomerTicket, getCustomerRides, nearbyDrivers, requestRide } from "../features/customer/customerApi";
import { initiateMpesaPayment } from "../features/rides/paymentApi";
import {
  Card,
  Badge,
  Button,
  Input,
  LoadingSpinner,
  Modal,
  EmptyState,
  StatCard,
  Avatar,
} from "../components/UIComponents";

export default function CustomerDashboard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    pickupLat: -1.3771,
    pickupLng: 38.0106,
    dropoffLat: -1.3656,
    dropoffLng: 38.0118,
    pickupAddress: "Kitui Town CBD",
    dropoffAddress: "Kalundu"
  });
  const [ticket, setTicket] = useState({ subject: "", description: "" });
  const [selectedRide, setSelectedRide] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRideForPayment, setSelectedRideForPayment] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("254700000000");

  const ridesQuery = useQuery({ queryKey: ["customer-rides"], queryFn: getCustomerRides });
  const driversQuery = useQuery({ queryKey: ["nearby-drivers"], queryFn: nearbyDrivers });

  const createRideMutation = useMutation({
    mutationFn: requestRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      // Reset form
      setForm({
        pickupLat: -1.3771,
        pickupLng: 38.0106,
        dropoffLat: -1.3656,
        dropoffLng: 38.0118,
        pickupAddress: "Kitui Town CBD",
        dropoffAddress: "Kalundu"
      });
    }
  });

  const payMutation = useMutation({
    mutationFn: initiateMpesaPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      setShowPaymentModal(false);
    }
  });

  const ticketMutation = useMutation({
    mutationFn: createCustomerTicket,
    onSuccess: () => {
      setTicket({ subject: "", description: "" });
      queryClient.invalidateQueries({ queryKey: ["customer-tickets"] });
    }
  });

  useEffect(() => {
    let disconnect = () => {};
    import("../lib/socket")
      .then(({ connectRideSocket }) => {
        disconnect = connectRideSocket({
          onRideUpdate: () => queryClient.invalidateQueries({ queryKey: ["customer-rides"] }),
          onNearbyDrivers: () => queryClient.invalidateQueries({ queryKey: ["nearby-drivers"] })
        });
      })
      .catch(() => {
        // Keep dashboard usable even if websocket client fails to initialize.
      });
    return () => disconnect();
  }, [queryClient]);

  const activeRides = (ridesQuery.data || []).filter(r => ["REQUESTED", "MATCHED", "ACCEPTED", "STARTED"].includes(r.status));
  const completedRides = (ridesQuery.data || []).filter(r => r.status === "COMPLETED");
  const cancelledRides = (ridesQuery.data || []).filter(r => r.status === "CANCELLED");

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Book Your Ride</h1>
        <p className="text-gray-600">Quick, reliable, and affordable rides in Kitui</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          label="Active Rides"
          value={activeRides.length}
          icon="🚗"
        />
        <StatCard
          label="Completed Rides"
          value={completedRides.length}
          icon="✓"
          trend={{ positive: true, text: "Total trips" }}
        />
        <StatCard
          label="Nearby Drivers"
          value={driversQuery.data?.length || 0}
          icon="👨‍💼"
          trend={{ positive: driversQuery.data?.length > 0 }}
        />
      </div>

      {/* Book a Ride Section */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Request a Ride</h2>

        {/* Map Placeholder */}
        <div className="mb-6 rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 p-8 text-center">
          <p className="text-teal-700 font-semibold">🗺️ Map Integration Coming Soon</p>
          <p className="text-teal-600 text-sm mt-1">
            Integrate Google Maps or Mapbox to pick locations visually
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            createRideMutation.mutate({
              ...form,
              pickupLat: Number(form.pickupLat),
              pickupLng: Number(form.pickupLng),
              dropoffLat: Number(form.dropoffLat),
              dropoffLng: Number(form.dropoffLng)
            });
          }}
        >
          {/* Pickup Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Pickup Location
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              placeholder="Enter pickup address"
              value={form.pickupAddress}
              onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })}
            />
          </div>

          {/* Dropoff Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏁 Dropoff Location
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              placeholder="Enter dropoff address"
              value={form.dropoffAddress}
              onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })}
            />
          </div>

          {/* Coordinates */}
          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-semibold">
              📌 Advanced: Edit Coordinates
            </summary>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-700 text-xs font-medium">Pickup Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={form.pickupLat}
                  onChange={(e) => setForm({ ...form, pickupLat: e.target.value })}
                />
              </div>
              <div>
                <label className="text-gray-700 text-xs font-medium">Pickup Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={form.pickupLng}
                  onChange={(e) => setForm({ ...form, pickupLng: e.target.value })}
                />
              </div>
              <div>
                <label className="text-gray-700 text-xs font-medium">Dropoff Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={form.dropoffLat}
                  onChange={(e) => setForm({ ...form, dropoffLat: e.target.value })}
                />
              </div>
              <div>
                <label className="text-gray-700 text-xs font-medium">Dropoff Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  value={form.dropoffLng}
                  onChange={(e) => setForm({ ...form, dropoffLng: e.target.value })}
                />
              </div>
            </div>
          </details>

          <Button
            className="w-full"
            size="lg"
            loading={createRideMutation.isPending}
          >
            🚗 Request Ride
          </Button>
        </form>
      </Card>

      {/* Nearby Drivers */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Nearby Drivers ({driversQuery.data?.length || 0})
        </h2>

        {driversQuery.isLoading ? (
          <LoadingSpinner />
        ) : (driversQuery.data || []).length === 0 ? (
          <EmptyState
            icon="👨‍💼"
            title="No Drivers Nearby"
            description="There are no drivers online in your area right now. Check back soon."
          />
        ) : (
          <div className="space-y-3">
            {(driversQuery.data || []).map((driver, idx) => (
              <Card key={idx} className="border-l-4 border-l-teal-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">Driver #{driver.riderId}</p>
                    <p className="text-sm text-gray-600">
                      📍 {driver.latitude.toFixed(4)}, {driver.longitude.toFixed(4)}
                    </p>
                  </div>
                  <Badge label="Online" variant="success" size="md" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Active Rides */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Active Rides ({activeRides.length})
        </h2>

        {ridesQuery.isLoading ? (
          <LoadingSpinner />
        ) : activeRides.length === 0 ? (
          <EmptyState
            icon="🚗"
            title="No Active Rides"
            description="You don't have any active rides at the moment. Book a ride above to get started."
          />
        ) : (
          <div className="space-y-3">
            {activeRides.map((ride) => (
              <div
                key={ride.id}
                className="flex items-start justify-between p-4 border-2 border-orange-200 rounded-lg bg-orange-50"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 mb-1">Ride #{ride.id}</p>
                  <p className="text-gray-800 font-medium mb-1">📍 {ride.pickupAddress}</p>
                  <p className="text-gray-800 font-medium mb-2">🏁 {ride.dropoffAddress}</p>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>💰 KES {ride.finalFare?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge
                    label={ride.status}
                    variant={
                      ride.status === "REQUESTED" || ride.status === "MATCHED"
                        ? "warning"
                        : "success"
                    }
                    size="md"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedRide(ride)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Completed Rides */}
      {completedRides.length > 0 && (
        <Card>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Completed Rides ({completedRides.length})
          </h2>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {completedRides.map((ride) => (
              <div
                key={ride.id}
                className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {ride.pickupAddress} → {ride.dropoffAddress}
                  </p>
                  <p className="text-sm text-gray-600">KES {ride.finalFare?.toFixed(2) || "0.00"}</p>
                </div>
                <div className="flex gap-2">
                  <Badge label="✓ Completed" variant="success" size="sm" />
                  {!ride.paid && (
                    <Button
                      variant="orange"
                      size="sm"
                      onClick={() => {
                        setSelectedRideForPayment(ride);
                        setShowPaymentModal(true);
                      }}
                    >
                      💳 Pay
                    </Button>
                  )}
                  {ride.paid && (
                    <Badge label="💳 Paid" variant="success" size="sm" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Support Section */}
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Need Support?</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            ticketMutation.mutate(ticket);
          }}
        >
          <Input
            label="Subject"
            placeholder="Briefly describe your issue"
            value={ticket.subject}
            onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
              rows={4}
              placeholder="Please provide details about your issue"
              value={ticket.description}
              onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
              required
            />
          </div>
          <Button
            className="w-full"
            loading={ticketMutation.isPending}
          >
            📝 Submit Support Ticket
          </Button>
        </form>
      </Card>

      {/* Ride Details Modal */}
      {selectedRide && (
        <Modal
          isOpen={!!selectedRide}
          title={`Ride #${selectedRide.id} Details`}
          onClose={() => setSelectedRide(null)}
        >
          <div className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm mb-1">Pickup Location</p>
              <p className="font-semibold text-gray-800 text-lg">📍 {selectedRide.pickupAddress}</p>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-1">Dropoff Location</p>
              <p className="font-semibold text-gray-800 text-lg">🏁 {selectedRide.dropoffAddress}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Status</p>
                <Badge label={selectedRide.status} variant="info" size="md" />
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">Fare</p>
                <p className="font-bold text-lg text-orange-600">
                  KES {selectedRide.finalFare?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-2">Coordinates</p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                <p className="font-mono">
                  <strong>Pickup:</strong> {selectedRide.pickupLat}, {selectedRide.pickupLng}
                </p>
                <p className="font-mono">
                  <strong>Dropoff:</strong> {selectedRide.dropoffLat}, {selectedRide.dropoffLng}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {selectedRideForPayment && (
        <Modal
          isOpen={showPaymentModal}
          title="Complete Payment"
          onClose={() => setShowPaymentModal(false)}
          footer={
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowPaymentModal(false)}
              >
                Cancel
              </Button>
              <Button
                loading={payMutation.isPending}
                onClick={() =>
                  payMutation.mutate({
                    rideId: selectedRideForPayment.id,
                    phoneNumber: phoneNumber
                  })
                }
              >
                Pay KES {selectedRideForPayment.finalFare?.toFixed(2) || "0.00"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-blue-700 text-sm">
                🔒 You will receive an M-Pesa prompt to confirm the payment
              </p>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-1">Ride</p>
              <p className="font-semibold text-gray-800">
                {selectedRideForPayment.pickupAddress} → {selectedRideForPayment.dropoffAddress}
              </p>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-1">Amount</p>
              <p className="text-2xl font-bold text-orange-600">
                KES {selectedRideForPayment.finalFare?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (254XXXXXXXXX)
              </label>
              <input
                type="tel"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                placeholder="254700000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
