import { apiFetch } from "./client";

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  roles: string[];
  enabled: boolean;
  managerId: number | null;
  managerName: string | null;
}

export function fetchAllUsers() {
  return apiFetch<UserResponse[]>("/users?size=500");
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
}

export function updateUser(id: number, req: UpdateUserRequest) {
  return apiFetch<UserResponse>(`/users/${id}`, { method: "PUT", body: JSON.stringify(req) });
}
