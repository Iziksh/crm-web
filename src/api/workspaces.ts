import { apiFetch } from "./client";

export type WorkspaceTaxStatus = "EXEMPT_DEALER" | "AUTHORIZED_DEALER" | "LIMITED_COMPANY";

export interface WorkspaceResponse {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  memberNames: string[];
  taxStatus: WorkspaceTaxStatus | null;
}

export interface WorkspaceRequest {
  name: string;
  description: string;
}

export function fetchWorkspaces() {
  return apiFetch<WorkspaceResponse[]>("/workspaces");
}

export function createWorkspace(req: WorkspaceRequest) {
  return apiFetch<WorkspaceResponse>("/workspaces", { method: "POST", body: JSON.stringify(req) });
}

export function deleteWorkspace(id: number) {
  return apiFetch<void>(`/workspaces/${id}`, { method: "DELETE" });
}

export function addWorkspaceMember(workspaceId: number, userId: number) {
  return apiFetch<WorkspaceResponse>(`/workspaces/${workspaceId}/members/${userId}`, { method: "POST" });
}

export function removeWorkspaceMember(workspaceId: number, userId: number) {
  return apiFetch<WorkspaceResponse>(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
}
