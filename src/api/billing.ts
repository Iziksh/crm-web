import { apiFetch, getAuthToken } from "./client";

export type PaymentRequestStatus = "OPEN" | "CONVERTED" | "CANCELLED";
export type DocumentType = "TAX_INVOICE" | "TAX_INVOICE_RECEIPT" | "RECEIPT" | "PROFORMA" | "QUOTE" | "CREDIT_INVOICE";
export type DocumentStatus = "DRAFT" | "ISSUED" | "CANCELLED";
export type VatType = "STANDARD" | "ZERO" | "EXEMPT";
export type DiscountType = "PERCENT" | "AMOUNT";
export type RoundingMode = "NONE" | "TO_AGOROT" | "TO_SHEKEL";
export type PaymentMethod = "CASH" | "CHECK" | "CREDIT_CARD" | "BANK_TRANSFER" | "OTHER";
export type AllocationStatus = "NOT_REQUIRED" | "PENDING" | "ISSUED" | "FAILED";

export interface LineItemPayload {
  productOrService: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface LineItemResponse extends LineItemPayload {
  id: number;
  lineTotal: number;
}

export interface PaymentRequestResponse {
  id: number;
  number: string;
  status: PaymentRequestStatus;
  currency: string | null;
  documentDate: string | null;
  freeText: string | null;
  totalAmount: number;
  accountId: number | null;
  accountName: string | null;
  convertedDocumentId: number | null;
  lineItems: LineItemResponse[];
}

export interface PaymentRequestCreateRequest {
  accountId: number;
  currency: string;
  documentDate: string;
  freeText: string;
  lineItems: LineItemPayload[];
}

export function fetchPaymentRequests() {
  return apiFetch<PaymentRequestResponse[]>("/billing/payment-requests?size=200");
}

export function fetchPaymentRequest(id: number) {
  return apiFetch<PaymentRequestResponse>(`/billing/payment-requests/${id}`);
}

export function createPaymentRequest(req: PaymentRequestCreateRequest) {
  return apiFetch<PaymentRequestResponse>("/billing/payment-requests", { method: "POST", body: JSON.stringify(req) });
}

export function updatePaymentRequest(id: number, req: PaymentRequestCreateRequest) {
  return apiFetch<PaymentRequestResponse>(`/billing/payment-requests/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function cancelPaymentRequest(id: number) {
  return apiFetch<void>(`/billing/payment-requests/${id}/cancel`, { method: "POST" });
}

export function convertPaymentRequest(id: number, targetDocumentType: DocumentType) {
  return apiFetch<TaxDocumentResponse>(`/billing/payment-requests/${id}/convert`, {
    method: "POST",
    body: JSON.stringify({ targetDocumentType }),
  });
}

export interface DocumentPaymentResponse {
  id: number;
  paymentMethod: PaymentMethod;
  amount: number;
  receivedAt: string | null;
}

export interface TaxDocumentResponse {
  id: number;
  documentType: DocumentType;
  number: string;
  status: DocumentStatus;
  currency: string | null;
  documentDate: string | null;
  freeText: string | null;
  vatType: VatType | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  roundingMode: RoundingMode | null;
  netTotal: number | null;
  vatAmount: number | null;
  grossTotal: number | null;
  allocationStatus: AllocationStatus | null;
  allocationNumber: string | null;
  accountId: number | null;
  accountName: string | null;
  lineItems: LineItemResponse[];
  payments: DocumentPaymentResponse[];
}

export interface TaxDocumentCreateRequest {
  documentType: DocumentType | "";
  accountId: number;
  currency: string;
  documentDate: string;
  freeText: string;
  vatType: VatType | "";
  discountType: DiscountType | "";
  discountValue: number | null;
  roundingMode: RoundingMode | "";
  lineItems: LineItemPayload[];
}

export function fetchTaxDocuments() {
  return apiFetch<TaxDocumentResponse[]>("/billing/tax-documents?size=200");
}

export function createTaxDocument(req: TaxDocumentCreateRequest) {
  return apiFetch<TaxDocumentResponse>("/billing/tax-documents", { method: "POST", body: JSON.stringify(req) });
}

export function updateTaxDocument(id: number, req: TaxDocumentCreateRequest) {
  return apiFetch<TaxDocumentResponse>(`/billing/tax-documents/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function issueTaxDocument(id: number) {
  return apiFetch<{ documentId: number; number: string; allocationStatus: AllocationStatus; allocationNumber: string | null; message: string }>(
    `/billing/tax-documents/${id}/issue`,
    { method: "POST" },
  );
}

export function addTaxDocumentPayment(id: number, req: { paymentMethod: PaymentMethod; amount: number; receivedAt: string }) {
  return apiFetch<DocumentPaymentResponse>(`/billing/tax-documents/${id}/payments`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

type DocumentOwnerType = "PAYMENT_REQUEST" | "TAX_DOCUMENT";

async function fetchPdfBlob(ownerType: DocumentOwnerType, id: number, download: boolean) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
  const token = getAuthToken();
  const res = await fetch(`${base}/billing/${ownerType}/${id}/pdf?download=${download}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load PDF");
  return res.blob();
}

export async function downloadPdf(ownerType: DocumentOwnerType, id: number) {
  const blob = await fetchPdfBlob(ownerType, id, true);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `document-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function viewPdf(ownerType: DocumentOwnerType, id: number) {
  const blob = await fetchPdfBlob(ownerType, id, false);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export function shareDocument(ownerType: DocumentOwnerType, documentId: number, channel: "EMAIL", target: string) {
  return apiFetch<void>("/billing/share", {
    method: "POST",
    body: JSON.stringify({ ownerType, documentId, channel, target }),
  });
}

export function getWhatsAppLink(ownerType: DocumentOwnerType, documentId: number, target: string) {
  return apiFetch<{ whatsappLink: string }>("/billing/share", {
    method: "POST",
    body: JSON.stringify({ ownerType, documentId, channel: "WHATSAPP", target }),
  });
}
