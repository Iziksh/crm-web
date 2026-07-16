import { apiFetch } from "./client";

export type ProductCategory = "SOFTWARE" | "HARDWARE" | "SERVICE" | "SUBSCRIPTION" | "CONSULTING" | "OTHER";

export interface ProductResponse {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: ProductCategory | null;
  unitPrice: number;
  currency: string | null;
  active: boolean;
}

export interface ProductRequest {
  sku: string;
  name: string;
  description: string;
  category: ProductCategory | "";
  unitPrice: number;
  currency: string;
}

export function fetchProducts(search: string) {
  const q = search ? `?search=${encodeURIComponent(search)}&size=200` : "?size=200";
  return apiFetch<ProductResponse[]>(`/products${q}`);
}

export function createProduct(req: ProductRequest) {
  return apiFetch<ProductResponse>("/products", { method: "POST", body: JSON.stringify(req) });
}

export function updateProduct(id: number, req: ProductRequest) {
  return apiFetch<ProductResponse>(`/products/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function toggleProduct(id: number) {
  return apiFetch<ProductResponse>(`/products/${id}/toggle`, { method: "PATCH" });
}
