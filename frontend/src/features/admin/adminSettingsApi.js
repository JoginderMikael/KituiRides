import { apiClient, unwrap } from "../../lib/apiClient";

export function getAdminSystemSettings() {
  return unwrap(apiClient.get("/admin/settings"));
}

export function updateAdminSystemSettings(payload) {
  return unwrap(apiClient.put("/admin/settings", payload));
}

export function refreshAdminSystemSettingsCache() {
  return unwrap(apiClient.post("/admin/settings/cache/refresh"));
}

export function restoreAdminSystemSettingsDefaults() {
  return unwrap(apiClient.post("/admin/settings/defaults/restore"));
}
