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

export function approveDriver(driverUserId, approved) {
  return unwrap(apiClient.patch(`/admin/drivers/${driverUserId}/approve`, { approved }));
}

export function updateDriverDetails(driverUserId, payload) {
  return unwrap(apiClient.patch(`/admin/drivers/${driverUserId}/details`, payload));
}

export function createSupportAgent(payload) {
  return unwrap(apiClient.post("/admin/support-agents", payload));
}

export function updateUserAccount(userId, payload) {
  return unwrap(apiClient.patch(`/admin/users/${userId}`, payload));
}

export function upgradeUserToAdmin(userId) {
  return unwrap(apiClient.patch(`/admin/users/${userId}/upgrade`));
}

export function deleteUser(userId) {
  return unwrap(apiClient.delete(`/admin/users/${userId}`));
}

export function getAdminConfigs() {
  return unwrap(apiClient.get("/admin/settings"));
}

export function updateAdminConfigs(payload) {
  return unwrap(apiClient.put("/admin/settings", payload));
}

export function refreshAdminConfigsCache() {
  return unwrap(apiClient.post("/admin/settings/cache/refresh"));
}

export function restoreDefaultAdminConfigs() {
  return unwrap(apiClient.post("/admin/settings/defaults/restore"));
}
