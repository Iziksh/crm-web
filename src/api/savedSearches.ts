import { apiFetch } from "./client";

export type SavedSearchScope = "ACCOUNT" | "CONTACT" | "ADDRESS" | "LEAD" | "OPPORTUNITY" | "ACTIVITY";

export interface SavedSearchResponse {
  id: number;
  name: string;
  scope: SavedSearchScope | null;
  filterJson: string | null;
}

export interface SavedSearchRequest {
  name: string;
  scope: SavedSearchScope | "";
  filterJson: string;
}

export function fetchSavedSearches() {
  return apiFetch<SavedSearchResponse[]>("/saved-searches");
}

export function createSavedSearch(req: SavedSearchRequest) {
  return apiFetch<SavedSearchResponse>("/saved-searches", { method: "POST", body: JSON.stringify(req) });
}

export function updateSavedSearch(id: number, req: SavedSearchRequest) {
  return apiFetch<SavedSearchResponse>(`/saved-searches/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteSavedSearch(id: number) {
  return apiFetch<void>(`/saved-searches/${id}`, { method: "DELETE" });
}

export function executeSavedSearch(id: number) {
  return apiFetch<{ count: number }>(`/saved-searches/${id}/execute`, { method: "POST" });
}
