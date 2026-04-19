import { apiClient, unwrap } from "../../lib/apiClient";

export function requestRide(payload) {
  return unwrap(apiClient.post("/customer/rides", payload));
}

export function getCustomerRides() {
  return unwrap(apiClient.get("/customer/rides"));
}

export function getCustomerRide(rideId) {
  return unwrap(apiClient.get(`/customer/rides/${rideId}`));
}

export function nearbyDrivers(params) {
  return unwrap(apiClient.get("/customer/nearby-drivers", { params }));
}

export function createCustomerTicket(payload) {
  return unwrap(apiClient.post("/customer/tickets", payload));
}

export function myCustomerTickets() {
  return unwrap(apiClient.get("/customer/tickets"));
}

export function disputeRide(rideId, payload) {
  return unwrap(apiClient.post(`/customer/rides/${rideId}/dispute`, payload));
}
