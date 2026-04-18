import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createCustomerTicket, getCustomerRides, nearbyDrivers, requestRide } from "../features/customer/customerApi";
import { initiateMpesaPayment } from "../features/rides/paymentApi";

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

  const ridesQuery = useQuery({ queryKey: ["customer-rides"], queryFn: getCustomerRides });
  const driversQuery = useQuery({ queryKey: ["nearby-drivers"], queryFn: nearbyDrivers });

  const createRideMutation = useMutation({
    mutationFn: requestRide,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-rides"] })
  });

  const payMutation = useMutation({
    mutationFn: initiateMpesaPayment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-rides"] })
  });
  const ticketMutation = useMutation({ mutationFn: createCustomerTicket });

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

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Book a ride</h2>
        <div className="mb-3 rounded border border-dashed border-teal-300 bg-teal-50 p-3 text-sm text-teal-700">
          Map placeholder: integrate Google Maps or Mapbox in this block.
        </div>
        <form
          className="grid grid-cols-2 gap-3"
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
          <input className="rounded border p-2" value={form.pickupAddress}
            onChange={(e) => setForm({ ...form, pickupAddress: e.target.value })} />
          <input className="rounded border p-2" value={form.dropoffAddress}
            onChange={(e) => setForm({ ...form, dropoffAddress: e.target.value })} />
          <input className="rounded border p-2" value={form.pickupLat}
            onChange={(e) => setForm({ ...form, pickupLat: e.target.value })} />
          <input className="rounded border p-2" value={form.pickupLng}
            onChange={(e) => setForm({ ...form, pickupLng: e.target.value })} />
          <input className="rounded border p-2" value={form.dropoffLat}
            onChange={(e) => setForm({ ...form, dropoffLat: e.target.value })} />
          <input className="rounded border p-2" value={form.dropoffLng}
            onChange={(e) => setForm({ ...form, dropoffLng: e.target.value })} />
          <button className="col-span-2 rounded bg-brand-primary p-2 text-white">
            {createRideMutation.isPending ? "Requesting..." : "Request Ride"}
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Nearby drivers</h2>
        <div className="text-sm">
          {(driversQuery.data || []).map((d) => (
            <p key={d.riderId}>Driver #{d.riderId}: {d.latitude}, {d.longitude}</p>
          ))}
          {!driversQuery.data?.length && "No nearby online drivers yet."}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">My rides</h2>
        <div className="space-y-2">
          {(ridesQuery.data || []).map((ride) => (
            <div key={ride.id} className="rounded border p-3 text-sm">
              <p className="font-medium">{ride.pickupAddress} {"->"} {ride.dropoffAddress}</p>
              <p>Status: {ride.status} | Fare: KES {ride.finalFare}</p>
              {ride.status === "COMPLETED" && (
                <button
                  onClick={() => payMutation.mutate({ rideId: ride.id, phoneNumber: "254700000000" })}
                  className="mt-2 rounded bg-brand-accent px-3 py-1 text-white"
                >
                  Pay via M-Pesa
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Need support?</h2>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            ticketMutation.mutate(ticket);
          }}
        >
          <input className="w-full rounded border p-2" placeholder="Subject" value={ticket.subject}
            onChange={(e) => setTicket({ ...ticket, subject: e.target.value })} />
          <textarea className="w-full rounded border p-2" rows={3} placeholder="Describe issue"
            value={ticket.description} onChange={(e) => setTicket({ ...ticket, description: e.target.value })} />
          <button className="rounded bg-slate-700 px-4 py-2 text-white">Submit Ticket</button>
        </form>
      </section>
    </div>
  );
}
