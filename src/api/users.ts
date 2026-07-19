import { apiFetch, buildQuery } from "./client";

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  managerId: number | null;
  managerName: string | null;
  accountId: number | null;
  accountName: string | null;
}

export function fetchAllUsers(accountId?: number | null) {
  return apiFetch<UserResponse[]>(`/users${buildQuery({ accountId, size: 500 })}`);
}

export function fetchMyDirectReports() {
  return apiFetch<UserResponse[]>("/users/my-direct-reports");
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roles: string[];
  managerId: number | null;
  /** Required for non-admin users; omitted for admin-tier users, who stay accountless. */
  accountId?: number | null;
}

export function createUser(req: CreateUserRequest) {
  return apiFetch<UserResponse>("/users", { method: "POST", body: JSON.stringify(req) });
}

export interface UpdateUserRequest {
  username: string;
  email: string;
  password: string;
  roles: string[];
  managerId: number | null;
  /** Optional on update — sent only to assign an account, never to clear one. */
  accountId?: number | null;
}

export function updateUser(id: number, req: UpdateUserRequest) {
  return apiFetch<UserResponse>(`/users/${id}`, { method: "PUT", body: JSON.stringify(req) });
}
