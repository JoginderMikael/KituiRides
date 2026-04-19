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

export function acceptDriverRide(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/accept`));
}

export function completeDriverRide(rideId) {
  return unwrap(apiClient.post(`/driver/rides/${rideId}/complete`));
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
