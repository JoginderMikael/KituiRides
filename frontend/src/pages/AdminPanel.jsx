import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveDriver, getDashboard, getRides, getUsers } from "../features/admin/adminApi";

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({ queryKey: ["admin-dashboard"], queryFn: getDashboard });
  const users = useQuery({ queryKey: ["admin-users"], queryFn: getUsers });
  const rides = useQuery({ queryKey: ["admin-rides"], queryFn: getRides });
  const approveMutation = useMutation({
    mutationFn: ({ id, approved }) => approveDriver(id, approved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] })
  });

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="Total users" value={dashboard.data?.totalUsers ?? "-"} />
        <Stat label="Total rides" value={dashboard.data?.totalRides ?? "-"} />
        <Stat label="Open requests" value={dashboard.data?.activeRideRequests ?? "-"} />
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-2 text-lg font-semibold">Users</h2>
        <div className="space-y-1 text-sm">
          {(users.data || []).map((u) => (
            <div key={u.id} className="rounded border p-2">
              <p>#{u.id} {u.firstName} {u.lastName} [{u.role}]</p>
              {u.role === "DRIVER" && (
                <div className="mt-1 flex gap-2">
                  <button className="rounded bg-green-700 px-2 py-1 text-white"
                    onClick={() => approveMutation.mutate({ id: u.id, approved: true })}>
                    Approve Driver
                  </button>
                  <button className="rounded bg-red-700 px-2 py-1 text-white"
                    onClick={() => approveMutation.mutate({ id: u.id, approved: false })}>
                    Reject Driver
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-2 text-lg font-semibold">Rides</h2>
        <div className="space-y-1 text-sm">
          {(rides.data || []).map((r) => (
            <p key={r.id}>#{r.id} {r.pickupAddress} {"->"} {r.dropoffAddress} ({r.status})</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-brand-primary">{value}</p>
    </div>
  );
}
