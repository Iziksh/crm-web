import { apiFetch } from "./client";
import type { LineItemRequest, LineItemResponse } from "./quotes";

export type SalesOrderStatus = "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

export interface SalesOrderResponse {
  id: number;
  orderNumber: string;
  status: SalesOrderStatus;
  orderDate: string | null;
  deliveryDate: string | null;
  totalAmount: number | null;
  currency: string | null;
  accountId: number | null;
  accountName: string | null;
  quoteId: number | null;
  quoteNumber: string | null;
  lineItems: LineItemResponse[];
}

export interface SalesOrderRequest {
  title: string;
  status: SalesOrderStatus | "";
  orderDate: string;
  deliveryDate: string;
  currency: string;
  notes: string;
  quoteId: number | null;
  accountId: number | null;
  contactId: number | null;
}

export function fetchSalesOrders() {
  return apiFetch<SalesOrderResponse[]>("/sales-orders?size=200");
}

export function createSalesOrder(req: SalesOrderRequest) {
  return apiFetch<SalesOrderResponse>("/sales-orders", { method: "POST", body: JSON.stringify(req) });
}

export function updateSalesOrder(id: number, req: SalesOrderRequest) {
  return apiFetch<SalesOrderResponse>(`/sales-orders/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteSalesOrder(id: number) {
  return apiFetch<void>(`/sales-orders/${id}`, { method: "DELETE" });
}

export function addSalesOrderLineItem(id: number, req: LineItemRequest) {
  return apiFetch<SalesOrderResponse>(`/sales-orders/${id}/line-items`, { method: "POST", body: JSON.stringify(req) });
}

export function removeSalesOrderLineItem(id: number, lineId: number) {
  return apiFetch<void>(`/sales-orders/${id}/line-items/${lineId}`, { method: "DELETE" });
}

export function convertSalesOrderToContract(id: number) {
  return apiFetch<unknown>(`/sales-orders/${id}/convert-to-contract`, { method: "POST" });
}
