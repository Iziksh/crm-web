import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { AttachmentPanel } from "../components/AttachmentPanel";
import { StatusPill } from "../components/StatusPill";
import { ATTENDANCE_REPORT_TYPE_META } from "../lib/statusMeta";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";
import {
  fetchActiveSession,
  punchIn,
  punchOut,
  createClockOutLine,
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
  const [punchError, setPunchError] = useState<string | null>(null);
  const [confirmClockOut, setConfirmClockOut] = useState<null | "no-clock-in" | "already-clocked-out">(null);
  const [confirmClockIn, setConfirmClockIn] = useState(false);

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

  const punchInMutation = useMutation({
    mutationFn: () => punchIn(note),
    onSuccess: () => { setPunchError(null); invalidateAll(); setNote(""); },
    onError: (err) => setPunchError(apiErrorMessage(err, "Couldn't clock in.")),
  });
  const forcePunchInMutation = useMutation({
    mutationFn: () => punchIn(note, true),
    onSuccess: () => { setPunchError(null); setConfirmClockIn(false); invalidateAll(); setNote(""); },
    onError: (err) => { setConfirmClockIn(false); setPunchError(apiErrorMessage(err, "Couldn't clock in.")); },
  });
  const punchOutMutation = useMutation({
    mutationFn: punchOut,
    onSuccess: () => { setPunchError(null); invalidateAll(); },
    onError: (err) => setPunchError(apiErrorMessage(err, "Couldn't clock out.")),
  });
  const clockOutLineMutation = useMutation({
    mutationFn: createClockOutLine,
    onSuccess: () => { setPunchError(null); setConfirmClockOut(null); invalidateAll(); },
    onError: (err) => { setConfirmClockOut(null); setPunchError(apiErrorMessage(err, "Couldn't clock out.")); },
  });

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

  // A "clock-out line" (exit with no matching clock-in) is stored with an end time but no total.
  const hasIncompleteClockOut = todaySessions.some((s) => s.endTime != null && s.durationSeconds == null);

  function handleClockIn() {
    setPunchError(null);
    if (activeSession) {
      // An entry is already open (entry without an exit) — confirm before starting another.
      setConfirmClockIn(true);
      return;
    }
    punchInMutation.mutate();
  }

  function handleClockOut() {
    setPunchError(null);
    if (activeSession) {
      // Normal path: close the open session. The backend enforces the 12h daily ceiling.
      punchOutMutation.mutate();
      return;
    }
    // No open session to close — confirm before recording a standalone clock-out line.
    setConfirmClockOut(hasIncompleteClockOut ? "already-clocked-out" : "no-clock-in");
  }

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
          <button
            className="btn btn-primary"
            disabled={punchInMutation.isPending || forcePunchInMutation.isPending}
            onClick={handleClockIn}
          >
            <LogIn size={16} /> Clock in
          </button>
          <button
            className="btn btn-danger"
            disabled={punchOutMutation.isPending || clockOutLineMutation.isPending}
            onClick={handleClockOut}
          >
            <LogOut size={16} /> Clock out
          </button>
        </div>

        {punchError && (
          <div className="time-clock-error" role="alert">
            <AlertTriangle size={16} /> <span>{punchError}</span>
          </div>
        )}
      </div>

      <div className="time-clock-card">
        <h3>Today's sessions</h3>
        {todaySessions.length === 0 && <p>No sessions recorded today.</p>}
        {todaySessions.map((s) => {
          // A clock-out line (exit with no matching clock-in) carries no entry — leave "in" empty.
          const isClockOutLine = s.source === "MANUAL_CLOCK_OUT";
          // An abandoned entry (entry without an exit) carries no exit — leave "out" empty.
          const isIncompleteEntry = s.source === "MANUAL_CLOCK_IN";
          return (
            <div className="time-clock-session-row" key={s.id}>
              <span>{isClockOutLine ? "—" : s.startTime.slice(11, 16)}</span>
              <span>{!isIncompleteEntry && s.endTime ? s.endTime.slice(11, 16) : "—"}</span>
              <span>{formatDuration(s.durationSeconds)}</span>
              <span>{s.note ?? ""}</span>
            </div>
          );
        })}
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
            <span style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
              <StatusPill
                label={ATTENDANCE_REPORT_TYPE_META[r.reportType]?.label ?? r.reportType}
                tone={ATTENDANCE_REPORT_TYPE_META[r.reportType]?.tone ?? "gray"}
              />
              {r.workType && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{r.workType.replace("_", " ")}</span>}
            </span>
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

      {confirmClockOut && (
        <Modal
          title="Confirm clock out"
          onClose={() => setConfirmClockOut(null)}
          width={420}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmClockOut(null)} disabled={clockOutLineMutation.isPending}>
                No
              </button>
              <button className="btn btn-primary" onClick={() => clockOutLineMutation.mutate()} disabled={clockOutLineMutation.isPending}>
                {clockOutLineMutation.isPending ? "Working…" : "Yes, continue"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            {confirmClockOut === "already-clocked-out"
              ? "There was already a clock-out. Do you want to continue?"
              : "There was no clock-in. Do you want to continue?"}
          </p>
        </Modal>
      )}

      {confirmClockIn && (
        <Modal
          title="Confirm clock in"
          onClose={() => setConfirmClockIn(false)}
          width={420}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmClockIn(false)} disabled={forcePunchInMutation.isPending}>
                No
              </button>
              <button className="btn btn-primary" onClick={() => forcePunchInMutation.mutate()} disabled={forcePunchInMutation.isPending}>
                {forcePunchInMutation.isPending ? "Working…" : "Yes, continue"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>There is an entry without an exit. Do you want to continue?</p>
        </Modal>
      )}
    </Layout>
  );
}
