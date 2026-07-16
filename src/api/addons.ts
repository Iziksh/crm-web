import { apiFetch } from "./client";

export interface AddonResponse {
  id: number;
  accountId: number;
  name: string;
  description: string | null;
  expiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddonRequest {
  name: string;
  description: string;
  expiryDate: string;
}

export function fetchAddons(accountId: number) {
  return apiFetch<AddonResponse[]>(`/accounts/${accountId}/addons`);
}

export function createAddon(accountId: number, req: AddonRequest) {
  return apiFetch<AddonResponse>(`/accounts/${accountId}/addons`, {
    method: "POST",
    body: JSON.stringify({ ...req, expiryDate: req.expiryDate || null }),
  });
}

export function updateAddon(accountId: number, addonId: number, req: AddonRequest) {
  return apiFetch<AddonResponse>(`/accounts/${accountId}/addons/${addonId}`, {
    method: "PUT",
    body: JSON.stringify({ ...req, expiryDate: req.expiryDate || null }),
  });
}

export function deleteAddon(accountId: number, addonId: number) {
  return apiFetch<void>(`/accounts/${accountId}/addons/${addonId}`, { method: "DELETE" });
}
