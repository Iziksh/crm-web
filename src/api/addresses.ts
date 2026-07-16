import { apiFetch } from "./client";

export type AddressType = "HOME" | "WORK" | "BILLING" | "SHIPPING" | "OTHER";

export interface AddressResponse {
  id: number;
  type: AddressType | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  enabled: boolean;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactName: string | null;
}

export interface AddressRequest {
  type: AddressType | "";
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  accountId: number | null;
  contactId: number | null;
}

export function fetchAddresses() {
  return apiFetch<AddressResponse[]>("/addresses");
}

export function createAddress(req: AddressRequest) {
  return apiFetch<AddressResponse>("/addresses", { method: "POST", body: JSON.stringify(req) });
}

export function updateAddress(id: number, req: AddressRequest) {
  return apiFetch<AddressResponse>(`/addresses/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteAddress(id: number) {
  return apiFetch<void>(`/addresses/${id}`, { method: "DELETE" });
}

export function toggleAddress(id: number) {
  return apiFetch<AddressResponse>(`/addresses/${id}/toggle`, { method: "PATCH" });
}
