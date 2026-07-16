import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setAuthToken, apiFetch } from "../api/client";

interface AuthUser {
  id: number | null;
  username: string;
  email: string;
  roles: string[];
  workspaceId: number | null;
  status: string | null;
  createdAt: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  signIn: (token: string, user: { username: string; email: string }) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "crm.session";

interface MeResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  workspaceId: number | null;
  status: string;
  createdAt: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const { token, user } = JSON.parse(raw);
      setAuthToken(token);
      setUser(user);
      refreshMe();
    }
    setReady(true);
  }, []);

  async function refreshMe() {
    try {
      const me = await apiFetch<MeResponse>("/auth/me");
      setUser((current) =>
        current
          ? { ...current, id: me.id, roles: me.roles, workspaceId: me.workspaceId, status: me.status, createdAt: me.createdAt }
          : current,
      );
    } catch {
      // Non-fatal — pages that need id/workspaceId will show their own "not found" state.
    }
  }

  function signIn(token: string, basicUser: { username: string; email: string }) {
    const user: AuthUser = { id: null, roles: [], workspaceId: null, status: null, createdAt: null, ...basicUser };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    setAuthToken(token);
    setUser(user);
    refreshMe();
  }

  function signOut() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
  }

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
