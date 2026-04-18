import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptRide, completeRide, getRiderRides, startRide, updateLocation } from "../features/rides/rideApi";

export default function DriverDashboard() {
  const queryClient = useQueryClient();
  const ridesQuery = useQuery({ queryKey: ["rider-rides"], queryFn: getRiderRides });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rider-rides"] });
  const acceptMutation = useMutation({ mutationFn: acceptRide, onSuccess: refresh });
  const startMutation = useMutation({ mutationFn: startRide, onSuccess: refresh });
  const completeMutation = useMutation({ mutationFn: completeRide, onSuccess: refresh });
  const locationMutation = useMutation({ mutationFn: updateLocation });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Driver controls</h2>
        <button
          className="rounded bg-brand-primary px-3 py-2 text-white"
          onClick={() => locationMutation.mutate({ latitude: -1.376, longitude: 38.01 })}
        >
          Go Online (Update Location)
        </button>
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
                {ride.status === "ACCEPTED" && (
                  <button className="rounded bg-teal-700 px-3 py-1 text-white"
                    onClick={() => startMutation.mutate(ride.id)}>Start</button>
                )}
                {ride.status === "STARTED" && (
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
