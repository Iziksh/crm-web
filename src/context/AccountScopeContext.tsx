import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { hasEffectiveRole } from "../lib/roles";

const STORAGE_KEY = "crm.accountScope";

interface AccountScopeValue {
  /** The account every scoped view should filter by. Null means "All Accounts". */
  accountId: number | null;
  /** True only for admins — standard users are locked to their assigned account. */
  canSelect: boolean;
  /** No-op for standard users, so callers never have to guard the call. */
  setAccountId: (id: number | null) => void;
}

const AccountScopeContext = createContext<AccountScopeValue | null>(null);

function readStored(): number | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw || raw === "all") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AccountScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const canSelect = hasEffectiveRole(user?.roles, "ROLE_ADMIN");
  const [selected, setSelected] = useState<number | null>(readStored);

  // /auth/me resolves after the first render, so a standard user's locked account
  // arrives late — drop any stored selection once we know they can't choose.
  useEffect(() => {
    if (!canSelect && selected !== null) {
      setSelected(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [canSelect, selected]);

  function setAccountId(id: number | null) {
    if (!canSelect) return;
    setSelected(id);
    if (id === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, String(id));
  }

  // Standard users always read their assigned account, never the stored selection.
  const accountId = canSelect ? selected : user?.accountId ?? null;

  return (
    <AccountScopeContext.Provider value={{ accountId, canSelect, setAccountId }}>
      {children}
    </AccountScopeContext.Provider>
  );
}

export function useAccountScope() {
  const ctx = useContext(AccountScopeContext);
  if (!ctx) throw new Error("useAccountScope must be used within AccountScopeProvider");
  return ctx;
}