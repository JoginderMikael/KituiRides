import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptDriverRide,
  completeDriverRide,
  getDriverDashboard,
  getDriverRides,
  updateDriverLocation,
  updateDriverStatus
} from "../features/driver/driverApi";

export default function DriverDashboard() {
  const queryClient = useQueryClient();
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
  const locationMutation = useMutation({ mutationFn: updateDriverLocation });

  const dashboard = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Driver dashboard</h2>
        <p className="text-sm">Verification: <strong>{dashboard?.verified ? "Verified" : "Pending review"}</strong></p>
        <p className="text-sm">Current status: <strong>{dashboard?.online ? "Online" : "Offline"}</strong></p>
        <p className="text-sm">Total earnings: <strong>KES {dashboard?.totalEarnings ?? "0.00"}</strong></p>
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-brand-primary px-3 py-2 text-white"
            onClick={() => statusMutation.mutate(true)}>Go Online</button>
          <button className="rounded bg-slate-700 px-3 py-2 text-white"
            onClick={() => statusMutation.mutate(false)}>Go Offline</button>
          <button
            className="rounded bg-brand-accent px-3 py-2 text-white"
            onClick={() => locationMutation.mutate({ latitude: -1.376, longitude: 38.01 })}
          >
            Update Location
          </button>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Assigned rides</h2>
        <div className="space-y-2">
          {(ridesQuery.data || []).map((ride) => (
            <div key={ride.id} className="rounded border p-3 text-sm">
              <p>{ride.pickupAddress} {"->"} {ride.dropoffAddress}</p>
              <p>Status: {ride.status}</p>
              <div className="mt-2 flex gap-2">
                {(ride.status === "MATCHED" || ride.status === "REQUESTED") && (
                  <button className="rounded bg-slate-700 px-3 py-1 text-white"
                    onClick={() => acceptMutation.mutate(ride.id)}>Accept</button>
                )}
                {(ride.status === "ACCEPTED" || ride.status === "STARTED") && (
                  <button className="rounded bg-orange-600 px-3 py-1 text-white"
                    onClick={() => completeMutation.mutate(ride.id)}>Complete</button>
                )}
              </div>
            </div>
          ))}
          {!ridesQuery.data?.length && <p className="text-sm">No rides yet.</p>}
        </div>
      </section>
    </div>
  );
}
