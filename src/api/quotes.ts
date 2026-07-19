import { apiFetch, buildQuery } from "./client";

export type QuoteStatus = "DRAFT" | "SENT" | "WON" | "LOST" | "EXPIRED";

export interface LineItemResponse {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  lineTotal: number;
}

export interface LineItemRequest {
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
}

export interface QuoteResponse {
  id: number;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  validUntil: string | null;
  totalAmount: number | null;
  currency: string | null;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactName: string | null;
  opportunityId: number | null;
  opportunityName: string | null;
  lineItems: LineItemResponse[];
}

export interface QuoteRequest {
  title: string;
  status: QuoteStatus | "";
  validUntil: string;
  currency: string;
  notes: string;
  opportunityId: number | null;
  accountId: number | null;
  contactId: number | null;
}

export function fetchQuotes(accountId?: number | null) {
  return apiFetch<QuoteResponse[]>(`/quotes${buildQuery({ accountId, size: 200 })}`);
}

export function createQuote(req: QuoteRequest) {
  return apiFetch<QuoteResponse>("/quotes", { method: "POST", body: JSON.stringify(req) });
}

export function updateQuote(id: number, req: QuoteRequest) {
  return apiFetch<QuoteResponse>(`/quotes/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteQuote(id: number) {
  return apiFetch<void>(`/quotes/${id}`, { method: "DELETE" });
}

export function addQuoteLineItem(id: number, req: LineItemRequest) {
  return apiFetch<QuoteResponse>(`/quotes/${id}/line-items`, { method: "POST", body: JSON.stringify(req) });
}

export function removeQuoteLineItem(id: number, lineId: number) {
  return apiFetch<void>(`/quotes/${id}/line-items/${lineId}`, { method: "DELETE" });
}

export function convertQuoteToOrder(id: number) {
  return apiFetch<unknown>(`/quotes/${id}/convert-to-order`, { method: "POST" });
}
