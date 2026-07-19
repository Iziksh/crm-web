import { apiFetch, buildQuery } from "./client";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "WON" | "LOST";

export interface LeadResponse {
  id: number;
  title: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
  source: string | null;
  estimatedValue: number | null;
  currency: string | null;
  closeDate: string | null;
  assignedToName: string | null;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactName: string | null;
  notes: string | null;
  createdAt: string;
}

export async function fetchLeads(accountId?: number | null): Promise<LeadResponse[]> {
  return apiFetch<LeadResponse[]>(`/leads${buildQuery({ accountId, size: 100 })}`);
}
