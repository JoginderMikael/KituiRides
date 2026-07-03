/**
 * @fileoverview Shared HTTP client utilities for frontend API calls.
 */
import axios from "axios";
import { getToken } from "./auth";

export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return "/api";
  if (/^https?:\/\//i.test(configured)) {
    const normalized = configured.replace(/\/$/, "");
    if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
      return "/api";
    }
    return normalized;
  }
  return configured;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl()
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function unwrap(promise) {
  const response = await promise;
  return response.data.data;
}
