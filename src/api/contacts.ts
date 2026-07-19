import { apiFetch, apiUpload, apiDownload, buildQuery } from "./client";

export interface ImportResultResponse {
  imported: number;
  skipped: number;
  errors: string[];
}

export type ContactStatus = "ACTIVE" | "INACTIVE" | "LEAD" | "PROSPECT";

export interface ContactResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  company: string | null;
  status: ContactStatus | null;
  notes: string | null;
  accountId: number | null;
  accountName: string | null;
}

export interface ContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  company: string;
  status: ContactStatus | "";
  notes: string;
  accountId: number | null;
}

export function fetchContacts(search: string, accountId?: number | null) {
  return apiFetch<ContactResponse[]>(`/contacts${buildQuery({ search, accountId, size: 200 })}`);
}

export function createContact(req: ContactRequest) {
  return apiFetch<ContactResponse>("/contacts", { method: "POST", body: JSON.stringify(req) });
}

export function updateContact(id: number, req: ContactRequest) {
  return apiFetch<ContactResponse>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteContact(id: number) {
  return apiFetch<void>(`/contacts/${id}`, { method: "DELETE" });
}

export function importContacts(file: File) {
  return apiUpload<ImportResultResponse>("/contacts/import", file);
}

export function exportContacts(search: string) {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiDownload(`/contacts/export${q}`, "contacts.csv");
}
