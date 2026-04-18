import { apiClient, unwrap } from "../../lib/apiClient";

export function createTicket(payload) {
  return unwrap(apiClient.post("/customer/tickets", payload));
}

export function myTickets() {
  return unwrap(apiClient.get("/customer/tickets"));
}

export function supportTickets() {
  return unwrap(apiClient.get("/support/tickets"));
}

export function replyTicket(ticketId, payload) {
  return unwrap(apiClient.post(`/support/tickets/${ticketId}/reply`, payload));
}

export function updateTicket(ticketId, payload) {
  return unwrap(apiClient.patch(`/support/tickets/${ticketId}`, payload));
}
