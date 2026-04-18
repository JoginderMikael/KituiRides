import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  acceptDriverRide,
  completeDriverRide,
  getDriverDashboard,
  getDriverRides,
  updateDriverLocation,
  updateDriverStatus
} from "../features/driver/driverApi";
import {
  Card,
  Badge,
  Button,
  LoadingSpinner,
  StatCard,
  Modal,
  EmptyState,
} from "../components/UIComponents";

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const [selectedRide, setSelectedRide] = useState(null);
  const [locationInput, setLocationInput] = useState({ lat: "-1.376", lng: "38.01" });

  const dashboardQuery = useQuery({ queryKey: ["driver-dashboard"], queryFn: getDriverDashboard });
  const ridesQuery = useQuery({ queryKey: ["driver-rides"], queryFn: getDriverRides });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["driver-rides"] });
    queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
  };

  const statusMutation = useMutation({
    mutationFn: updateDriverStatus,
    onSuccess: refresh
  });

  const acceptMutation = useMutation({ mutationFn: acceptDriverRide, onSuccess: refresh });
  const completeMutation = useMutation({ mutationFn: completeDriverRide, onSuccess: refresh });
  const locationMutation = useMutation({ mutationFn: updateDriverLocation, onSuccess: refresh });

  const dashboard = dashboardQuery.data;
  const rides = ridesQuery.data || [];
  const assignedRides = rides.filter(r => ["MATCHED", "REQUESTED", "ACCEPTED", "STARTED"].includes(r.status));
  const completedRides = rides.filter(r => r.status === "COMPLETED");

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Driver Dashboard</h1>
        <p className="text-gray-600">Manage your rides and earnings</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <StatCard
          label="Online Status"
          value={dashboard?.online ? "Online" : "Offline"}
          icon={dashboard?.online ? "🟢" : "🔴"}
        />
        <StatCard
          label="Total Earnings"
          value={`KES ${dashboard?.totalEarnings?.toFixed(0) || "0"}`}
          icon="💰"
          trend={{ positive: true, text: "This month" }}
        />
        <StatCard
          label="Active Trips"
          value={dashboard?.activeTrip ? "1" : "0"}
          icon="🚗"
        />
        <StatCard
          label="Completed Rides"
          value={completedRides.length}
          icon="✓"
          trend={{ positive: true, text: `${completedRides.length} total` }}
        />
      </div>

      {/* Driver Info & Vehicle Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Driver Status Card */}
        <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200">
          <h2 className="text-xl font-bold text-teal-900 mb-4">Driver Status</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-teal-700 font-semibold">Verification</span>
              <Badge
                label={dashboard?.verified ? "Verified ✓" : "Pending Review"}
                variant={dashboard?.verified ? "success" : "warning"}
                size="md"
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-teal-700 font-semibold">Current Status</span>
              <Badge
                label={dashboard?.online ? "Online" : "Offline"}
                variant={dashboard?.online ? "success" : "error"}
                size="md"
              />
            </div>

            <div className="pt-3 border-t-2 border-teal-200 space-y-2">
              <Button
                className="w-full"
                variant={dashboard?.online ? "danger" : "primary"}
                onClick={() => statusMutation.mutate(!dashboard?.online)}
                loading={statusMutation.isPending}
              >
                {dashboard?.online ? "🔴 Go Offline" : "🟢 Go Online"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Vehicle Info Card */}
        {dashboard?.vehicle && (
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
            <h2 className="text-xl font-bold text-orange-900 mb-4">Vehicle Information</h2>

            <div className="space-y-3">
              <div>
                <p className="text-orange-700 text-sm">Make & Model</p>
                <p className="font-bold text-orange-900 text-lg">
                  {dashboard.vehicle.make} {dashboard.vehicle.model}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-orange-700 text-sm">Color</p>
                  <p className="font-bold text-orange-900">{dashboard.vehicle.color}</p>
                </div>
                <div>
                  <p className="text-orange-700 text-sm">License Plate</p>
                  <p className="font-bold text-orange-900">{dashboard.vehicle.plateNumber}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Location Update */}
      <Card>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Update Location</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <input
            type="number"
            step="0.0001"
            placeholder="Latitude"
            value={locationInput.lat}
            onChange={(e) => setLocationInput({ ...locationInput, lat: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          <input
            type="number"
            step="0.0001"
            placeholder="Longitude"
            value={locationInput.lng}
            onChange={(e) => setLocationInput({ ...locationInput, lng: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
        <Button
          className="w-full"
          onClick={() =>
            locationMutation.mutate({
              latitude: parseFloat(locationInput.lat),
              longitude: parseFloat(locationInput.lng)
            })
          }
          loading={locationMutation.isPending}
        >
          📍 Update Location
        </Button>
      </Card>

      {/* Active Rides */}
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Available & Active Rides</h2>
          <Badge
            label={`${assignedRides.length} Available`}
            variant="info"
            size="md"
          />
        </div>

        {ridesQuery.isLoading ? (
          <LoadingSpinner />
        ) : assignedRides.length === 0 ? (
          <EmptyState
            icon="🚗"
            title="No Available Rides"
            description="Check back soon for new ride requests. Stay online to receive new assignments."
          />
        ) : (
          <div className="space-y-3">
            {assignedRides.map((ride) => (
              <div
                key={ride.id}
                className="flex items-start justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-teal-400 transition"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-800 text-lg">#{ride.id}</p>
                    <Badge
                      label={ride.status}
                      variant={
                        ride.status === "MATCHED" || ride.status === "REQUESTED"
                          ? "warning"
                          : ride.status === "ACCEPTED"
                          ? "info"
                          : "success"
                      }
                      size="sm"
                    />
                  </div>

                  <p className="text-gray-800 font-medium mb-1">
                    📍 {ride.pickupAddress}
                  </p>
                  <p className="text-gray-800 font-medium mb-2">
                    🏁 {ride.dropoffAddress}
                  </p>

                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>💰 KES {ride.finalFare?.toFixed(2) || "0.00"}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {(ride.status === "MATCHED" || ride.status === "REQUESTED") && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => acceptMutation.mutate(ride.id)}
                      loading={acceptMutation.isPending}
                    >
                      ✓ Accept
                    </Button>
                  )}
                  {(ride.status === "ACCEPTED" || ride.status === "STARTED") && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => completeMutation.mutate(ride.id)}
                      loading={completeMutation.isPending}
                    >
                      ✓ Complete
                    </Button>
                  )}
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
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Completed Rides ({completedRides.length})
          </h2>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {completedRides.slice(0, 5).map((ride) => (
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
                <Badge label="✓ Completed" variant="success" size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}

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
              <p className="font-semibold text-gray-800 text-lg">
                {selectedRide.pickupAddress}
              </p>
            </div>

            <div>
              <p className="text-gray-600 text-sm mb-1">Dropoff Location</p>
              <p className="font-semibold text-gray-800 text-lg">
                {selectedRide.dropoffAddress}
              </p>
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
    </div>
  );
}
