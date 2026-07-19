import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { fetchAccounts } from "../api/accounts";
import { useAccountScope } from "../context/AccountScopeContext";
import "./AccountSelector.css";

const ALL = "all";

export function AccountSelector() {
  const { accountId, canSelect, setAccountId } = useAccountScope();

  // Standard users are locked to their assigned account, so the control is hidden
  // entirely rather than rendered disabled — and the request is never issued.
  const { data: accounts } = useQuery({
    queryKey: ["accounts", ""],
    queryFn: () => fetchAccounts(""),
    enabled: canSelect,
  });

  if (!canSelect) return null;

  return (
    <label className="account-selector">
      <Building2 size={15} aria-hidden />
      <span className="account-selector-label">Account</span>
      <select
        value={accountId == null ? ALL : String(accountId)}
        onChange={(e) => setAccountId(e.target.value === ALL ? null : Number(e.target.value))}
      >
        <option value={ALL}>All Accounts</option>
        {accounts?.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </label>
  );
}
