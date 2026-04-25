/**
 * @fileoverview API helper module for support api.
 */
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

export function getSupportRide(rideId) {
  return unwrap(apiClient.get(`/support/rides/${rideId}`));
}

export function fixRideKms(rideId, kms) {
  return unwrap(apiClient.patch(`/support/rides/${rideId}/kms`, null, { params: { kms } }));
}

export function resolveRide(rideId, payload) {
  return unwrap(apiClient.patch(`/support/rides/${rideId}/resolve`, payload));
}

export function forceApprovePayment(rideId) {
  return unwrap(apiClient.post(`/support/rides/${rideId}/approve-payment`));
}

export function getSupportContact() {
  return unwrap(apiClient.get("/support/contact"));
}
