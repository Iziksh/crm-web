import { apiFetch, buildQuery } from "./client";

export type ActivityType = "BUG" | "FEATURE" | "TASK" | "MEETING" | "CALL" | "EMAIL" | "SALES_VISIT" | "MAILING" | "SMS" | "ABSENCE";
export type ActivityStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type ActivityPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ActivityNoteResponse {
  id: number;
  text: string;
  authorName: string;
  createdAt: string;
}

export interface ActivityResponse {
  id: number;
  title: string;
  description: string | null;
  type: ActivityType | null;
  status: ActivityStatus;
  priority: ActivityPriority | null;
  dueDate: string | null;
  assignedToId: number | null;
  assignedToName: string | null;
  accountId: number | null;
  accountName: string | null;
  contactId: number | null;
  contactName: string | null;
  notes: ActivityNoteResponse[];
}

export interface ActivityRequest {
  title: string;
  description: string;
  type: ActivityType | "";
  status: ActivityStatus | "";
  priority: ActivityPriority | "";
  dueDate: string;
  assignedToId: number | null;
  accountId: number | null;
  contactId: number | null;
}

export function fetchActivities(accountId?: number | null) {
  return apiFetch<ActivityResponse[]>(`/activities${buildQuery({ accountId, size: 200 })}`);
}

export function fetchCalendarActivities(from: string, to: string) {
  return apiFetch<ActivityResponse[]>(`/activities/calendar?from=${from}&to=${to}`);
}

export function createActivity(req: ActivityRequest) {
  return apiFetch<ActivityResponse>("/activities", { method: "POST", body: JSON.stringify(req) });
}

export function updateActivity(id: number, req: ActivityRequest) {
  return apiFetch<ActivityResponse>(`/activities/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteActivity(id: number) {
  return apiFetch<void>(`/activities/${id}`, { method: "DELETE" });
}

export function assignActivity(id: number, username: string) {
  return apiFetch<ActivityResponse>(`/activities/${id}/assign?username=${encodeURIComponent(username)}`, { method: "PATCH" });
}

export function resolveActivity(id: number) {
  return apiFetch<ActivityResponse>(`/activities/${id}/resolve`, { method: "PATCH" });
}

export function reopenActivity(id: number) {
  return apiFetch<ActivityResponse>(`/activities/${id}/reopen`, { method: "PATCH" });
}

export function addActivityNote(id: number, text: string) {
  return apiFetch<ActivityNoteResponse>(`/activities/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
