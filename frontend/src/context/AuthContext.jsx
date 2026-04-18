import { createContext, useContext, useMemo, useState } from "react";
import { clearSession, getSession, saveSession } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getSession());

  const value = useMemo(() => ({
    session,
    role: session?.role || null,
    login: (authResponse) => {
      saveSession(authResponse);
      setSession(getSession());
    },
    logout: () => {
      clearSession();
      setSession(null);
    }
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
