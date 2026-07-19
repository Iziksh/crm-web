import { apiFetch, buildQuery } from "./client";

export type OpportunityStage = "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST";

export interface OpportunityResponse {
  id: number;
  name: string;
  stage: OpportunityStage;
  amount: number | null;
  currency: string | null;
  probability: number | null;
  closeDate: string | null;
  assignedToName: string | null;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactName: string | null;
  weightedAmount: number | null;
}

export interface OpportunityRequest {
  name: string;
  stage: OpportunityStage | "";
  amount: number | null;
  currency: string;
  probability: number | null;
  closeDate: string;
  notes: string;
  accountId: number | null;
  contactId: number | null;
}

export function fetchOpportunities(accountId?: number | null) {
  return apiFetch<OpportunityResponse[]>(`/opportunities${buildQuery({ accountId, size: 200 })}`);
}

export function createOpportunity(req: OpportunityRequest) {
  return apiFetch<OpportunityResponse>("/opportunities", { method: "POST", body: JSON.stringify(req) });
}

export function updateOpportunity(id: number, req: OpportunityRequest) {
  return apiFetch<OpportunityResponse>(`/opportunities/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteOpportunity(id: number) {
  return apiFetch<void>(`/opportunities/${id}`, { method: "DELETE" });
}
