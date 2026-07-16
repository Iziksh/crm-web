import { apiFetch } from "./client";

export type TaskStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "SUSPENDED" | "CANCELLED" | "FAILED" | "SKIPPED";
export type AlertImportance = "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";

export interface ScheduledTaskResponse {
  id: number;
  workflowKey: string;
  workflowName: string;
  targetEntityType: string;
  targetEntityId: number;
  recipientUsername: string | null;
  status: TaskStatus;
  priority: AlertImportance | null;
  scheduledAt: string | null;
  createdAt: string;
  attemptCount: number;
  maxAttempts: number;
  lastAttemptedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface TaskStats {
  pending: number;
  failed: number;
  suspended: number;
  completedToday: number;
}

export function fetchScheduledTasks(status?: TaskStatus) {
  const q = status ? `?status=${status}&size=200` : "?size=200";
  return apiFetch<ScheduledTaskResponse[]>(`/scheduled-tasks${q}`);
}

export function fetchTaskStats() {
  return apiFetch<TaskStats>("/scheduled-tasks/stats");
}

export function runTaskNow(id: number) {
  return apiFetch<ScheduledTaskResponse>(`/scheduled-tasks/${id}/run-now`, { method: "POST" });
}

export function suspendTask(id: number, reason: string) {
  return apiFetch<ScheduledTaskResponse>(`/scheduled-tasks/${id}/suspend`, { method: "POST", body: JSON.stringify({ reason }) });
}

export function resumeTask(id: number) {
  return apiFetch<ScheduledTaskResponse>(`/scheduled-tasks/${id}/resume`, { method: "POST" });
}

export function cancelTask(id: number, reason: string) {
  return apiFetch<ScheduledTaskResponse>(`/scheduled-tasks/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
}

export function retryTask(id: number) {
  return apiFetch<ScheduledTaskResponse>(`/scheduled-tasks/${id}/retry`, { method: "POST" });
}
