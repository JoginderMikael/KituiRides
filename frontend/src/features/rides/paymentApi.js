import { apiClient, unwrap } from "../../lib/apiClient";

export function initiateMpesaPayment(payload) {
  return unwrap(apiClient.post("/payments/mpesa/stk-push", payload));
}

export function getRidePayment(rideId) {
  return unwrap(apiClient.get(`/payments/ride/${rideId}`));
}
