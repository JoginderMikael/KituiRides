import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createTicket, myTickets } from "../features/support/supportApi";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["my-tickets"], queryFn: myTickets });
  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      setSubject("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Create support ticket</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ subject, description });
        }} className="space-y-3">
          <input className="w-full rounded border p-2" placeholder="Subject" value={subject}
            onChange={(e) => setSubject(e.target.value)} />
          <textarea className="w-full rounded border p-2" rows={4} placeholder="Describe your issue"
            value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className="rounded bg-brand-primary px-4 py-2 text-white">Submit ticket</button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">My tickets</h2>
        <div className="space-y-2 text-sm">
          {(tickets.data || []).map((ticket) => (
            <div key={ticket.id} className="rounded border p-3">
              <p className="font-medium">{ticket.subject}</p>
              <p>{ticket.description}</p>
              <p className="mt-1 text-slate-500">Status: {ticket.status}</p>
            </div>
          ))}
          {!tickets.data?.length && "No tickets yet."}
        </div>
      </section>
    </div>
  );
}
