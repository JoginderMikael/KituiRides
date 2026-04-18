import { apiClient, unwrap } from "../../lib/apiClient";

export function getDashboard() {
  return unwrap(apiClient.get("/admin/dashboard"));
}

export function getUsers() {
  return unwrap(apiClient.get("/admin/users"));
}

export function getRides() {
  return unwrap(apiClient.get("/admin/rides"));
}
