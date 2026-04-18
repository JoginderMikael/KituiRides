import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { replyTicket, supportTickets, updateTicket } from "../features/support/supportApi";

export default function SupportPage() {
  const [replyByTicketId, setReplyByTicketId] = useState({});
  const queryClient = useQueryClient();
  const tickets = useQuery({ queryKey: ["support-tickets"], queryFn: supportTickets });
  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }) => replyTicket(ticketId, { message }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
  });
  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status }) => updateTicket(ticketId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] })
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-5 shadow">
        <h2 className="mb-3 text-xl font-semibold">Assigned/Open Tickets</h2>
        <div className="space-y-2 text-sm">
          {(tickets.data || []).map((ticket) => (
            <div key={ticket.id} className="rounded border p-3">
              <p className="font-medium">{ticket.subject}</p>
              <p>{ticket.description}</p>
              <p className="mt-1 text-slate-500">Status: {ticket.status}</p>
              <div className="mt-2 flex gap-2">
                <button className="rounded bg-slate-700 px-2 py-1 text-white"
                  onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "IN_PROGRESS" })}>
                  Mark In Progress
                </button>
                <button className="rounded bg-green-700 px-2 py-1 text-white"
                  onClick={() => statusMutation.mutate({ ticketId: ticket.id, status: "RESOLVED" })}>
                  Mark Resolved
                </button>
              </div>
              <div className="mt-2">
                <textarea
                  className="w-full rounded border p-2"
                  rows={2}
                  placeholder="Reply to customer..."
                  value={replyByTicketId[ticket.id] || ""}
                  onChange={(e) => setReplyByTicketId({ ...replyByTicketId, [ticket.id]: e.target.value })}
                />
                <button
                  className="mt-1 rounded bg-brand-primary px-3 py-1 text-white"
                  onClick={() => replyMutation.mutate({ ticketId: ticket.id, message: replyByTicketId[ticket.id] || "" })}
                >
                  Send Reply
                </button>
              </div>
              {!!ticket.replies?.length && (
                <div className="mt-2 rounded bg-slate-50 p-2">
                  {ticket.replies.map((reply) => (
                    <p key={reply.id} className="text-xs">#{reply.authorUserId}: {reply.message}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!tickets.data?.length && "No tickets yet."}
        </div>
      </section>
    </div>
  );
}
