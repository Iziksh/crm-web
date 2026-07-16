import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Layout } from "../components/Layout";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { StatusPill, type PillTone } from "../components/StatusPill";
import {
  fetchCorrections,
  approveAttendance,
  rejectAttendance,
  type AttendanceApprovalStatus,
  type CorrectionLogEntryResponse,
} from "../api/timetracking";
import "./AttendanceCorrectionsPage.css";

const STATUS_META: Record<AttendanceApprovalStatus, { label: string; tone: PillTone }> = {
  PENDING: { label: "Pending", tone: "orange" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
};

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: "month" | "twoMonths" | "year" | "all") {
  const now = new Date();
  if (preset === "all") return { from: "", to: "" };
  if (preset === "month") return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
  if (preset === "twoMonths") return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: isoDate(now) };
  return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to: isoDate(new Date(now.getFullYear(), 11, 31)) };
}

export function AttendanceCorrectionsPage() {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<CorrectionLogEntryResponse | null>(null);
  const [reason, setReason] = useState("");
  const [range, setRange] = useState(() => presetRange("month"));
  const [status, setStatus] = useState<AttendanceApprovalStatus | "">("");

  const { data: corrections, isLoading, isError } = useQuery({
    queryKey: ["corrections", range.from, range.to, status],
    queryFn: () => fetchCorrections({ from: range.from || undefined, to: range.to || undefined, status: status || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["corrections"] });
  const approveMutation = useMutation({ mutationFn: approveAttendance, onSuccess: invalidate });
  const rejectMutation = useMutation({
    mutationFn: (vars: { id: number; reason: string }) => rejectAttendance(vars.id, vars.reason),
    onSuccess: () => { invalidate(); setRejecting(null); setReason(""); },
  });

  const columns: Column<CorrectionLogEntryResponse>[] = [
    { header: "Date", render: (a) => a.startTime.slice(0, 10) },
    { header: "Employee", render: (a) => <strong>{a.employeeName ?? `User #${a.userId}`}</strong> },
    { header: "Entry", render: (a) => a.startTime.slice(11, 16) },
    { header: "Exit", render: (a) => (a.endTime ? a.endTime.slice(11, 16) : "—") },
    { header: "Duration", render: (a) => formatDuration(a.durationSeconds) },
    { header: "Note", render: (a) => a.note ?? a.rejectionReason ?? "" },
    { header: "Status", render: (a) => <StatusPill label={STATUS_META[a.approvalStatus].label} tone={STATUS_META[a.approvalStatus].tone} /> },
    { header: "Approver", render: (a) => a.approverName ?? "—" },
    {
      header: "Actions",
      width: "100px",
      render: (a) =>
        a.approvalStatus === "PENDING" ? (
          <span className="data-table-actions">
            <button type="button" className="icon-btn" title="Approve" onClick={() => approveMutation.mutate(a.id)}>
              <Check size={15} />
            </button>
            <button type="button" className="icon-btn icon-btn-danger" title="Reject" onClick={() => setRejecting(a)}>
              <X size={15} />
            </button>
          </span>
        ) : null,
    },
  ];

  return (
    <Layout title="Correction Log" subtitle="History of attendance corrections and their approval status." rtlToggle>
      <div className="cor-filter-bar">
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setRange(presetRange("month"))}>This month</button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setRange(presetRange("twoMonths"))}>Last 2 months</button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setRange(presetRange("year"))}>Tax year</button>
        <button type="button" className="btn btn-secondary btn-small" onClick={() => setRange(presetRange("all"))}>All</button>
        <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <span>–</span>
        <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <select value={status} onChange={(e) => setStatus(e.target.value as AttendanceApprovalStatus | "")}>
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {isLoading && <p>Loading corrections…</p>}
      {isError && <p>Couldn't load corrections.</p>}
      {corrections && corrections.length === 0 && <p>No corrections match these filters.</p>}
      {corrections && corrections.length > 0 && <DataTable columns={columns} rows={corrections} keyFn={(a) => a.id} />}

      {rejecting && (
        <Modal
          title={`Reject correction — ${rejecting.employeeName ?? `User #${rejecting.userId}`}`}
          onClose={() => setRejecting(null)}
          width={400}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!reason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({ id: rejecting.id, reason })}
              >
                Reject
              </button>
            </>
          }
        >
          <label className="field">
            <span>Reason</span>
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this correction being rejected?" />
          </label>
        </Modal>
      )}
    </Layout>
  );
}
