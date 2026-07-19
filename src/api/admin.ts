import { apiFetch } from "./client";

export type UserStatus = "INVITED" | "ACTIVE" | "DISABLED";

export interface UserAdminResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  status: UserStatus;
  workspaceId: number | null;
  managerId: number | null;
  managerName: string | null;
  /** Optional: only the /users admin listing resolves these, not /admin/users. */
  accountId?: number | null;
  accountName?: string | null;
}

export function fetchWorkspaceUsers(workspaceId: number) {
  return apiFetch<UserAdminResponse[]>(`/admin/users?workspaceId=${workspaceId}`);
}

export function inviteUser(email: string, role: string, workspaceId: number) {
  return apiFetch<{ message: string }>("/admin/users/invite", {
    method: "POST",
    body: JSON.stringify({ email, role, workspaceId }),
  });
}

export function disableUser(id: number) {
  return apiFetch<void>(`/admin/users/${id}/disable`, { method: "PUT" });
}

export function enableUser(id: number) {
  return apiFetch<void>(`/admin/users/${id}/enable`, { method: "PUT" });
}

export function changeUserRole(id: number, role: string) {
  return apiFetch<void>(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
}

export function removeUser(id: number) {
  return apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export function changeUserManager(id: number, managerId: number | null) {
  return apiFetch<void>(`/admin/users/${id}/manager`, { method: "PUT", body: JSON.stringify({ managerId }) });
}
