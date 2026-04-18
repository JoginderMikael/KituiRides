import { apiClient, unwrap } from "../../lib/apiClient";

export function requestRide(payload) {
  return unwrap(apiClient.post("/rides", payload));
}

export function getCustomerRides() {
  return unwrap(apiClient.get("/rides/me/customer"));
}

export function getRiderRides() {
  return unwrap(apiClient.get("/rides/me/rider"));
}

export function acceptRide(rideId) {
  return unwrap(apiClient.post(`/rides/${rideId}/accept`));
}

export function startRide(rideId) {
  return unwrap(apiClient.post(`/rides/${rideId}/start`));
}

export function completeRide(rideId) {
  return unwrap(apiClient.post(`/rides/${rideId}/complete`));
}

export function updateLocation(payload) {
  return unwrap(apiClient.post("/locations/me", payload));
}

export function nearbyDrivers() {
  return unwrap(apiClient.get("/locations/nearby-drivers"));
}
