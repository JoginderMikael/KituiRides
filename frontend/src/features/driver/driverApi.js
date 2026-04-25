/**
 * @fileoverview API helper module for driver api.
 */
import { apiClient, unwrap } from "../../lib/apiClient";

export function getDriverDashboard() {
  return unwrap(apiClient.get("/driver/dashboard"));
}

export function updateDriverStatus(online) {
  return unwrap(apiClient.post("/driver/status", { online }));
}

export function getDriverRides() {
  return unwrap(apiClient.get("/driver/rides"));
}

export function getDriverOffers() {
  return unwrap(apiClient.get("/driver/offers"));
}

export function acceptDriverRide(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/accept`));
}

export function rejectDriverRide(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/reject`));
}

export function markDriverArrival(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/arrive`));
}

export function startDriverRide(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/start`));
}

export function completeDriverRide(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/complete`));
}

export function cancelDriverRide(rideId, reason) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/cancel`, { reason }));
}

export function submitManualDistance(rideId, distanceKm) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/distance`, { distanceKm }));
}

export function updateDriverLocation(payload) {
  return unwrap(apiClient.post("/locations/me", payload));
}

export function updateVehicleDetails(payload) {
  return unwrap(apiClient.post("/driver/vehicle", payload));
}

export function approveCashPayment(rideId) {
  return unwrap(apiClient.post(`/payments/ride/${rideId}/approve-cash`));
}
