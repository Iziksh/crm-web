import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RotateCcw, XCircle } from "lucide-react";
import { Layout } from "../components/Layout";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { StatusPill } from "../components/StatusPill";
import {
  fetchScheduledTasks,
  fetchTaskStats,
  runTaskNow,
  suspendTask,
  resumeTask,
  cancelTask,
  retryTask,
  type ScheduledTaskResponse,
  type TaskStatus,
} from "../api/scheduledTasks";
import "./ScheduledTasksPage.css";

const STATUS_TONE: Record<TaskStatus, "blue" | "gray" | "green" | "red" | "orange"> = {
  PENDING: "blue",
  PROCESSING: "gray",
  COMPLETED: "green",
  SUSPENDED: "gray",
  CANCELLED: "gray",
  FAILED: "red",
  SKIPPED: "gray",
};

export function ScheduledTasksPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [suspendingTask, setSuspendingTask] = useState<ScheduledTaskResponse | null>(null);
  const [cancellingTask, setCancellingTask] = useState<ScheduledTaskResponse | null>(null);
  const [reason, setReason] = useState("");

  const { data: tasks, isLoading, isError } = useQuery({
    queryKey: ["scheduled-tasks", statusFilter],
    queryFn: () => fetchScheduledTasks(statusFilter || undefined),
  });
  const { data: stats } = useQuery({ queryKey: ["scheduled-task-stats"], queryFn: fetchTaskStats });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["scheduled-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["scheduled-task-stats"] });
  };
  const runNowMutation = useMutation({ mutationFn: runTaskNow, onSuccess: invalidate });
  const resumeMutation = useMutation({ mutationFn: resumeTask, onSuccess: invalidate });
  const retryMutation = useMutation({ mutationFn: retryTask, onSuccess: invalidate });
  const suspendMutation = useMutation({
    mutationFn: (vars: { id: number; reason: string }) => suspendTask(vars.id, vars.reason),
    onSuccess: () => { invalidate(); setSuspendingTask(null); setReason(""); },
  });
  const cancelMutation = useMutation({
    mutationFn: (vars: { id: number; reason: string }) => cancelTask(vars.id, vars.reason),
    onSuccess: () => { invalidate(); setCancellingTask(null); setReason(""); },
  });

  const columns: Column<ScheduledTaskResponse>[] = [
    { header: "Workflow", render: (t) => <strong>{t.workflowKey} — {t.workflowName}</strong>, width: "1.6fr" },
    { header: "Target", render: (t) => `${t.targetEntityType} #${t.targetEntityId}` },
    { header: "Recipient", render: (t) => t.recipientUsername ?? "—" },
    { header: "Status", render: (t) => <StatusPill label={t.status} tone={STATUS_TONE[t.status]} /> },
    { header: "Tries", render: (t) => `${t.attemptCount}/${t.maxAttempts}` },
    {
      header: "Actions",
      width: "150px",
      render: (t) => (
        <span className="data-table-actions">
          {(t.status === "PENDING" || t.status === "SUSPENDED") && (
            <button type="button" className="icon-btn" title="Run now" onClick={() => runNowMutation.mutate(t.id)}>
              <Play size={15} />
            </button>
          )}
          {t.status === "SUSPENDED" && (
            <button type="button" className="icon-btn" title="Resume" onClick={() => resumeMutation.mutate(t.id)}>
              <RotateCcw size={15} />
            </button>
          )}
          {t.status === "PENDING" && (
            <button type="button" className="icon-btn" title="Suspend" onClick={() => setSuspendingTask(t)}>
              <Pause size={15} />
            </button>
          )}
          {t.status === "FAILED" && (
            <button type="button" className="icon-btn" title="Retry" onClick={() => retryMutation.mutate(t.id)}>
              <RotateCcw size={15} />
            </button>
          )}
          {t.status !== "COMPLETED" && t.status !== "CANCELLED" && (
            <button type="button" className="icon-btn icon-btn-danger" title="Cancel" onClick={() => setCancellingTask(t)}>
              <XCircle size={15} />
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <Layout title="Scheduled tasks" subtitle="Automated workflow queue — alerts, reminders, and notifications.">
      {stats && (
        <div className="task-stats-row">
          <div className="task-stat"><StatusPill label={`Pending: ${stats.pending}`} tone="blue" /></div>
          <div className="task-stat"><StatusPill label={`Failed: ${stats.failed}`} tone="red" /></div>
          <div className="task-stat"><StatusPill label={`Suspended: ${stats.suspended}`} tone="gray" /></div>
          <div className="task-stat"><StatusPill label={`Done today: ${stats.completedToday}`} tone="green" /></div>
        </div>
      )}

      <div className="task-filter-row">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | "")}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading && <p>Loading tasks…</p>}
      {isError && <p>Couldn't load scheduled tasks.</p>}
      {tasks && <DataTable columns={columns} rows={tasks} keyFn={(t) => t.id} />}

      {suspendingTask && (
        <Modal
          title="Suspend task"
          onClose={() => setSuspendingTask(null)}
          width={380}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setSuspendingTask(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => suspendMutation.mutate({ id: suspendingTask.id, reason })} disabled={suspendMutation.isPending}>
                Suspend
              </button>
            </>
          }
        >
          <label className="field">
            <span>Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </Modal>
      )}

      {cancellingTask && (
        <Modal
          title="Cancel task"
          onClose={() => setCancellingTask(null)}
          width={380}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCancellingTask(null)}>Go back</button>
              <button className="btn btn-primary" onClick={() => cancelMutation.mutate({ id: cancellingTask.id, reason: reason || "Cancelled by admin" })} disabled={cancelMutation.isPending}>
                Cancel task
              </button>
            </>
          }
        >
          <label className="field">
            <span>Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancelled by admin" />
          </label>
        </Modal>
      )}
    </Layout>
  );
}
