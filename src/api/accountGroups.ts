import { apiFetch } from "./client";

export interface AccountGroupResponse {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  parentName: string | null;
  memberCount: number;
}

export interface AccountGroupRequest {
  name: string;
  description: string;
  parentId: number | null;
}

export function fetchAccountGroups(search: string) {
  const q = search ? `?search=${encodeURIComponent(search)}&size=200` : "?size=200";
  return apiFetch<AccountGroupResponse[]>(`/account-groups${q}`);
}

export function createAccountGroup(req: AccountGroupRequest) {
  return apiFetch<AccountGroupResponse>("/account-groups", { method: "POST", body: JSON.stringify(req) });
}

export function updateAccountGroup(id: number, req: AccountGroupRequest) {
  return apiFetch<AccountGroupResponse>(`/account-groups/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteAccountGroup(id: number) {
  return apiFetch<void>(`/account-groups/${id}`, { method: "DELETE" });
}
