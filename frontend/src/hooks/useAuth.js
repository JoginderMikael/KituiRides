/**
 * @fileoverview Custom hook for use auth.
 */
import { useAuthContext } from "../context/AuthContext";

export function useAuth() {
  return useAuthContext();
}
