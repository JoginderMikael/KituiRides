/**
 * @fileoverview Shared HTTP client utilities for frontend API calls.
 */
import axios from "axios";
import { getToken } from "./auth";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
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
