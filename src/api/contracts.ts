import { apiFetch } from "./client";

export type ContractStatus = "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";

export interface ContractResponse {
  id: number;
  contractNumber: string;
  title: string;
  status: ContractStatus;
  startDate: string | null;
  endDate: string | null;
  totalValue: number | null;
  currency: string | null;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactName: string | null;
  salesOrderId: number | null;
  orderNumber: string | null;
}

export interface ContractRequest {
  title: string;
  status: ContractStatus | "";
  startDate: string;
  endDate: string;
  totalValue: number | null;
  currency: string;
  description: string;
  terms: string;
  salesOrderId: number | null;
  accountId: number | null;
  contactId: number | null;
}

export function fetchContracts() {
  return apiFetch<ContractResponse[]>("/contracts?size=200");
}

export function createContract(req: ContractRequest) {
  return apiFetch<ContractResponse>("/contracts", { method: "POST", body: JSON.stringify(req) });
}

export function updateContract(id: number, req: ContractRequest) {
  return apiFetch<ContractResponse>(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteContract(id: number) {
  return apiFetch<void>(`/contracts/${id}`, { method: "DELETE" });
}
