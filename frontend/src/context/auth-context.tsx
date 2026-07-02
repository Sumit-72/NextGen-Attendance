"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiRequest } from "@/lib/api";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/auth-storage";
import { signOutFromFirebase } from "@/lib/firebase";
import type { MeResult, Role, SessionExchangeResult, SessionUser } from "@/types/auth";

type AuthContextValue = {
  user: SessionUser | null;
  permissions: string[];
  loading: boolean;
  signIn: (idToken: string, roleHint: Role) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    const token = getSessionToken();
    if (!token) {
      setUser(null);
      setPermissions([]);
      return;
    }

    const session = await apiRequest<MeResult>("/api/auth/me");
    setUser(session.user);
    setPermissions(session.permissions);
  }, []);

  useEffect(() => {
    hydrate()
      .catch(() => {
        clearSessionToken();
        setUser(null);
        setPermissions([]);
      })
      .finally(() => setLoading(false));
  }, [hydrate]);

  const signIn = useCallback(async (idToken: string, roleHint: Role) => {
    const session = await apiRequest<SessionExchangeResult>("/api/auth/session", {
      method: "POST",
      body: { idToken, roleHint },
      auth: false,
    });

    setSessionToken(session.sessionToken);
    setUser(session.user);
    setPermissions(session.permissions);
    return session.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Session may already be invalid.
    }

    await signOutFromFirebase();
    clearSessionToken();
    setUser(null);
    setPermissions([]);
  }, []);

  const value = useMemo(
    () => ({
      user,
      permissions,
      loading,
      signIn,
      signOut,
      refresh: hydrate,
    }),
    [user, permissions, loading, signIn, signOut, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
