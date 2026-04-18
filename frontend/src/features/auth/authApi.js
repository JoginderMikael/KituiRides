import { apiClient, unwrap } from "../../lib/apiClient";

export function login(payload) {
  return unwrap(apiClient.post("/auth/login", payload));
}

export function register(payload) {
  return unwrap(apiClient.post("/auth/register", payload));
}

export function getMe() {
  return unwrap(apiClient.get("/users/me"));
}
