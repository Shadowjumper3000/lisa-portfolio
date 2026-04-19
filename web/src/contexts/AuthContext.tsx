import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const AUTH_EXPIRED_EVENT = "auth-expired";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("auth_token"));

  const setToken = useCallback((t: string) => {
    localStorage.setItem("auth_token", t);
    setTokenState(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setTokenState(null);
  }, []);

  useEffect(() => {
    const handler = () => setTokenState(localStorage.getItem("auth_token"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    const handler = () => setTokenState(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handler);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, setToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
