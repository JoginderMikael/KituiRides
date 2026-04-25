/**
 * @fileoverview API helper module for payment api.
 */
import { apiClient, unwrap } from "../../lib/apiClient";

export function initiateMpesaPayment(payload) {
  return unwrap(apiClient.post("/payments/mpesa/stk-push", payload));
}

export function getRidePayment(rideId) {
  return unwrap(apiClient.get(`/payments/ride/${rideId}`));
}

export function approveCashPayment(rideId, payload = {}) {
  return unwrap(apiClient.post(`/payments/ride/${rideId}/approve-cash`, payload));
}
