import { apiClient, unwrap } from "../../lib/apiClient";

export function createTicket(payload) {
  return unwrap(apiClient.post("/support/tickets", payload));
}

export function myTickets() {
  return unwrap(apiClient.get("/support/tickets/me"));
}
