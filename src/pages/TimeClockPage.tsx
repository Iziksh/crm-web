import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, Trash2, Pencil } from "lucide-react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { AttachmentPanel } from "../components/AttachmentPanel";
import { useAuth } from "../context/AuthContext";
import {
  fetchActiveSession,
  punchIn,
  punchOut,
  fetchMonthlyAttendance,
  fetchMonthlyCalendar,
  createAttendanceReport,
  updateAttendanceReport,
  deleteAttendanceReport,
  type AttendanceReportType,
  type AttendanceReportResponse,
  type WorkType,
} from "../api/timetracking";
import "./TimeClockPage.css";

const REPORT_TYPE_OPTIONS: { value: AttendanceReportType; label: string }[] = [
  { value: "PRESENCE", label: "Presence (manual)" },
  { value: "VACATION", label: "Vacation" },
  { value: "SICK", label: "Sick" },
  { value: "RESERVE_DUTY", label: "Reserve duty" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "ABSENCE", label: "Absence" },
];

const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: "OFFICE", label: "Office" },
  { value: "WORK_FROM_HOME", label: "Work from home" },
  { value: "FIELD_CLIENT", label: "Field / client site" },
  { value: "ON_CALL", label: "On call" },
];

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

interface ReportForm {
  reportDate: string;
  reportType: AttendanceReportType;
  entryTime: string;
  exitTime: string;
  workType: WorkType | "";
  projectTag: string;
  note: string;
}

function emptyForm(): ReportForm {
  return {
    reportDate: new Date().toISOString().slice(0, 10),
    reportType: "VACATION",
    entryTime: "",
    exitTime: "",
    workType: "",
    projectTag: "",
    note: "",
  };
}

export function TimeClockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [showReportForm, setShowReportForm] = useState(false);
  const [editingReport, setEditingReport] = useState<AttendanceReportResponse | null>(null);
  const [form, setForm] = useState<ReportForm>(emptyForm());

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const todayStr = today.toISOString().slice(0, 10);

  const { data: activeSession } = useQuery({
    queryKey: ["active-session", user?.id],
    queryFn: () => fetchActiveSession(user!.id!),
    enabled: !!user?.id,
  });
  const { data: monthlyRecords } = useQuery({
    queryKey: ["monthly-attendance", user?.id, year, month],
    queryFn: () => fetchMonthlyAttendance(user!.id!, year, month),
    enabled: !!user?.id,
  });
  const { data: calendar } = useQuery({
    queryKey: ["monthly-calendar", user?.id, year, month],
    queryFn: () => fetchMonthlyCalendar(user!.id!, year, month),
    enabled: !!user?.id,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["active-session"] });
    queryClient.invalidateQueries({ queryKey: ["monthly-attendance"] });
    queryClient.invalidateQueries({ queryKey: ["monthly-calendar"] });
  };

  const punchInMutation = useMutation({ mutationFn: () => punchIn(note), onSuccess: () => { invalidateAll(); setNote(""); } });
  const punchOutMutation = useMutation({ mutationFn: punchOut, onSuccess: invalidateAll });

  function toRequest(f: ReportForm) {
    const isPresence = f.reportType === "PRESENCE";
    return {
      reportDate: f.reportDate,
      entryTime: isPresence && f.entryTime ? f.entryTime : null,
      exitTime: isPresence && f.exitTime ? f.exitTime : null,
      note: f.note,
      reportType: f.reportType,
      equateToStandard: !isPresence,
      workType: isPresence && f.workType ? f.workType : null,
      projectTag: f.projectTag,
    };
  }

  const createReportMutation = useMutation({
    mutationFn: () => createAttendanceReport(toRequest(form)),
    onSuccess: () => { invalidateAll(); setShowReportForm(false); },
  });
  const updateReportMutation = useMutation({
    mutationFn: () => updateAttendanceReport(editingReport!.id, toRequest(form)),
    onSuccess: () => { invalidateAll(); setShowReportForm(false); },
  });
  const deleteReportMutation = useMutation({ mutationFn: deleteAttendanceReport, onSuccess: invalidateAll });

  const todaySessions = monthlyRecords?.filter((r) => r.startTime.slice(0, 10) === todayStr) ?? [];
  const todayTotalSeconds = todaySessions.reduce((sum, r) => sum + (r.durationSeconds ?? 0), 0);

  const leaveReports = calendar?.days.flatMap((d) => d.reports) ?? [];

  function openCreate() {
    setEditingReport(null);
    setForm(emptyForm());
    setShowReportForm(true);
  }

  function openEdit(r: AttendanceReportResponse) {
    setEditingReport(r);
    setForm({
      reportDate: r.reportDate,
      reportType: r.reportType,
      entryTime: r.entryTime ?? "",
      exitTime: r.exitTime ?? "",
      workType: r.workType ?? "",
      projectTag: r.projectTag ?? "",
      note: r.note ?? "",
    });
    setShowReportForm(true);
  }

  const isPresence = form.reportType === "PRESENCE";
  const saving = createReportMutation.isPending || updateReportMutation.isPending;

  return (
    <Layout title="Time clock" subtitle="Track your work sessions and submit leave reports." rtlToggle>
      <div className="time-clock-card">
        <div className="time-clock-status">
          <div className={"status-dot" + (activeSession ? " status-dot-active" : "")} />
          <div>
            <div className="status-text">{activeSession ? "Clocked in" : "Clocked out"}</div>
            {activeSession && <div className="status-since">Since {activeSession.startTime.slice(11, 16)}</div>}
          </div>
        </div>

        {!activeSession && (
          <input className="time-clock-note" placeholder="Optional note…" value={note} onChange={(e) => setNote(e.target.value)} />
        )}

        <div className="time-clock-buttons">
          <button className="btn btn-primary" disabled={!!activeSession || punchInMutation.isPending} onClick={() => punchInMutation.mutate()}>
            <LogIn size={16} /> Clock in
          </button>
          <button className="btn btn-secondary" disabled={!activeSession || punchOutMutation.isPending} onClick={() => punchOutMutation.mutate()}>
            <LogOut size={16} /> Clock out
          </button>
        </div>
      </div>

      <div className="time-clock-card">
        <h3>Today's sessions</h3>
        {todaySessions.length === 0 && <p>No sessions recorded today.</p>}
        {todaySessions.map((s) => (
          <div className="time-clock-session-row" key={s.id}>
            <span>{s.startTime.slice(11, 16)}</span>
            <span>{s.endTime ? s.endTime.slice(11, 16) : "—"}</span>
            <span>{formatDuration(s.durationSeconds)}</span>
            <span>{s.note ?? ""}</span>
          </div>
        ))}
        {todaySessions.length > 0 && <div className="time-clock-total">Total: {formatDuration(todayTotalSeconds)}</div>}
      </div>

      <div className="time-clock-card">
        <div className="detail-panel-header">
          <h3>Leave &amp; presence reports this month</h3>
          <button className="btn btn-secondary btn-small" onClick={openCreate}>Add report</button>
        </div>
        {leaveReports.length === 0 && <p>No reports this month.</p>}
        {leaveReports.map((r) => (
          <div className="time-clock-session-row" key={r.id}>
            <span>{r.reportDate}</span>
            <span>{r.reportType}{r.workType ? ` · ${r.workType.replace("_", " ")}` : ""}</span>
            <span>{r.durationFormatted ?? "Full day"}</span>
            <span>{r.projectTag ?? r.note ?? ""}</span>
            <span className="time-clock-actions">
              <button type="button" className="icon-btn" onClick={() => openEdit(r)}>
                <Pencil size={14} />
              </button>
              <button type="button" className="icon-btn icon-btn-danger" onClick={() => deleteReportMutation.mutate(r.id)}>
                <Trash2 size={14} />
              </button>
            </span>
          </div>
        ))}
      </div>

      {showReportForm && (
        <Modal
          title={editingReport ? "Edit report" : "Add report"}
          onClose={() => setShowReportForm(false)}
          width={480}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowReportForm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => (editingReport ? updateReportMutation.mutate() : createReportMutation.mutate())}
                disabled={saving}
              >
                {saving ? "Saving…" : "Submit"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <SelectField
              label="Type"
              value={form.reportType}
              onChange={(v) => setForm({ ...form, reportType: v as AttendanceReportType })}
              options={REPORT_TYPE_OPTIONS}
            />
            <Field label="Date" type="date" value={form.reportDate} onChange={(v) => setForm({ ...form, reportDate: v })} />
            {isPresence && (
              <>
                <Field label="Entry time" type="time" value={form.entryTime} onChange={(v) => setForm({ ...form, entryTime: v })} />
                <Field label="Exit time" type="time" value={form.exitTime} onChange={(v) => setForm({ ...form, exitTime: v })} />
                <SelectField
                  label="Work type"
                  value={form.workType}
                  onChange={(v) => setForm({ ...form, workType: v as WorkType })}
                  options={WORK_TYPE_OPTIONS}
                />
              </>
            )}
            <Field label="Project / cost center" value={form.projectTag} onChange={(v) => setForm({ ...form, projectTag: v })} span2={!isPresence} />
            <Field label="Note" value={form.note} onChange={(v) => setForm({ ...form, note: v })} span2 />
          </div>
          <AttachmentPanel entityType="ATTENDANCE_REPORT" entityId={editingReport?.id ?? null} />
        </Modal>
      )}
    </Layout>
  );
}
