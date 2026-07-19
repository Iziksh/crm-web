import { apiFetch, apiUpload, apiDownload, buildQuery } from "./client";
import type { ImportResultResponse } from "./contacts";

export type AccountType = "PROSPECT" | "CUSTOMER" | "PARTNER" | "VENDOR";

export interface AccountAddonSummary {
  id: number;
  name: string;
  expiryDate: string | null;
}

export interface AccountResponse {
  id: number;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  type: AccountType | null;
  notes: string | null;
  addons: AccountAddonSummary[];
}

export interface AccountRequest {
  name: string;
  industry: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  type: AccountType | "";
  notes: string;
}

export function fetchAccounts(search: string, accountId?: number | null) {
  return apiFetch<AccountResponse[]>(`/accounts${buildQuery({ search, accountId, size: 200 })}`);
}

export function fetchAccount(id: number) {
  return apiFetch<AccountResponse>(`/accounts/${id}`);
}

export interface AccountContactResponse {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
}

export function fetchAccountContacts(id: number) {
  return apiFetch<AccountContactResponse[]>(`/accounts/${id}/contacts`);
}

export function createAccount(req: AccountRequest) {
  return apiFetch<AccountResponse>("/accounts", { method: "POST", body: JSON.stringify(req) });
}

export function updateAccount(id: number, req: AccountRequest) {
  return apiFetch<AccountResponse>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteAccount(id: number) {
  return apiFetch<void>(`/accounts/${id}`, { method: "DELETE" });
}

export function importAccounts(file: File) {
  return apiUpload<ImportResultResponse>("/accounts/import", file);
}

export function exportAccounts(search: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiDownload(`/accounts/export${q}`, "accounts.csv");
}
