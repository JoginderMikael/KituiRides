/**
 * @fileoverview React context module for auth context.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearSession, getSession, saveSession } from "../lib/auth";
import { apiClient, unwrap } from "../lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession());
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!session?.token) {
        setUserProfile(null);
        return;
      }
      try {
        const profile = await unwrap(apiClient.get("/users/me"));
        if (!ignore) {
          setUserProfile(profile);
        }
      } catch {
        if (!ignore) {
          setUserProfile(null);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [session]);

  const value = useMemo(() => ({
    session,
    user: userProfile,
    setUser: setUserProfile,
    role: session?.role || null,
    login: (authResponse) => {
      saveSession(authResponse);
      setSession(getSession());
    },
    logout: () => {
      clearSession();
      setSession(null);
      setUserProfile(null);
    }
  }), [session, userProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
