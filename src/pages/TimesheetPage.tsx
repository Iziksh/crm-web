import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Lock, Send, Download } from "lucide-react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { StatusPill, type PillTone } from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { hasCompanyWideAttendanceAccess } from "../lib/roles";
import {
  fetchMonthlyCalendar,
  fetchMonthLockStatus,
  submitMonthLock,
  approveMonthLock,
  rejectMonthLock,
  exportDailyDetail,
  exportMonthlySummaryCsv,
  exportAbsences,
  type MonthLockStatus,
} from "../api/timetracking";
import { fetchAllUsers, fetchMyDirectReports } from "../api/users";
import "./TimesheetPage.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const LOCK_STATUS_META: Record<MonthLockStatus, { label: string; tone: PillTone }> = {
  OPEN: { label: "Open", tone: "gray" },
  SUBMITTED: { label: "Pending approval", tone: "orange" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Sent back", tone: "red" },
};

const REPORT_TYPE_LABEL: Record<string, string> = {
  PRESENCE: "Work",
  VACATION: "Vacation",
  SICK: "Sick",
  RESERVE_DUTY: "Reserve duty",
  HOLIDAY: "Holiday",
  ABSENCE: "Absence",
};

function formatMinutes(mins: number) {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  return `${sign}${Math.floor(abs / 60)}:${(abs % 60).toString().padStart(2, "0")}`;
}

export function TimesheetPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = hasCompanyWideAttendanceAccess(user?.roles);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data: allUsers } = useQuery({ queryKey: ["all-users"], queryFn: fetchAllUsers, enabled: isAdmin });
  const { data: directReports } = useQuery({ queryKey: ["my-direct-reports"], queryFn: fetchMyDirectReports });

  const targetUserId = selectedUserId ?? user?.id ?? null;
  const isSelf = targetUserId === user?.id;
  const isManagerOfTarget = !isSelf && (directReports?.some((r) => r.id === targetUserId) ?? false);
  const canApprove = isAdmin || isManagerOfTarget;

  const { data: calendar, isLoading, isError } = useQuery({
    queryKey: ["timesheet-calendar", targetUserId, cursor.year, cursor.month],
    queryFn: () => fetchMonthlyCalendar(targetUserId!, cursor.year, cursor.month),
    enabled: !!targetUserId,
  });

  const { data: lock } = useQuery({
    queryKey: ["month-lock", targetUserId, cursor.year, cursor.month],
    queryFn: () => fetchMonthLockStatus(targetUserId!, cursor.year, cursor.month),
    enabled: !!targetUserId,
  });

  const invalidateLock = () => queryClient.invalidateQueries({ queryKey: ["month-lock", targetUserId, cursor.year, cursor.month] });

  const submitMutation = useMutation({
    mutationFn: () => submitMonthLock(cursor.year, cursor.month),
    onSuccess: invalidateLock,
  });
  const approveMutation = useMutation({
    mutationFn: () => approveMonthLock(targetUserId!, cursor.year, cursor.month),
    onSuccess: invalidateLock,
  });
  const rejectMutation = useMutation({
    mutationFn: () => rejectMonthLock(targetUserId!, cursor.year, cursor.month, rejectReason),
    onSuccess: () => { invalidateLock(); setShowReject(false); setRejectReason(""); },
  });

  function navigate(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }

  const dayTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    calendar?.days.forEach((day) => {
      day.reports.forEach((r) => {
        if (r.reportType !== "PRESENCE") {
          counts[r.reportType] = (counts[r.reportType] ?? 0) + 1;
        }
      });
    });
    return counts;
  }, [calendar]);

  const pickerOptions = isAdmin ? allUsers : directReports;

  return (
    <Layout title="Timesheet" subtitle="Detailed day-by-day breakdown, overtime, and month-end approval." rtlToggle>
      {pickerOptions && pickerOptions.length > 0 && (
        <div className="ts-user-picker">
          <select value={selectedUserId ?? ""} onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">My timesheet</option>
            {pickerOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
      )}

      <div className="ts-nav">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
        <span className="ts-month-label">{cursor.year}-{cursor.month.toString().padStart(2, "0")}</span>
        <button type="button" className="icon-btn" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
        {lock && <StatusPill label={LOCK_STATUS_META[lock.status].label} tone={LOCK_STATUS_META[lock.status].tone} />}
        <span className="ts-export-group">
          <button type="button" className="btn btn-secondary btn-small" onClick={() => exportDailyDetail(targetUserId!, cursor.year, cursor.month)}>
            <Download size={14} /> Daily detail
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => exportMonthlySummaryCsv(targetUserId!, cursor.year, cursor.month)}>
            <Download size={14} /> Monthly summary
          </button>
          <button type="button" className="btn btn-secondary btn-small" onClick={() => exportAbsences(targetUserId!, cursor.year, cursor.month)}>
            <Download size={14} /> Absences
          </button>
        </span>
      </div>

      {lock?.status === "REJECTED" && lock.rejectionReason && (
        <div className="ts-rejection-note">Sent back: {lock.rejectionReason}</div>
      )}

      {isLoading && <p>Loading timesheet…</p>}
      {isError && <p>Couldn't load timesheet.</p>}

      {calendar && (
        <>
          <div className="ts-table-wrap">
            <table className="ts-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Type / Times</th>
                  <th>Worked</th>
                  <th>Standard</th>
                  <th>Regular</th>
                  <th>OT 125%</th>
                  <th>OT 150%</th>
                  <th>Delta</th>
                </tr>
              </thead>
              <tbody>
                {calendar.days.map((day) => (
                  <tr key={day.date} className={(day.isWeekend ? "ts-weekend " : "") + (day.isHoliday ? "ts-holiday" : "")}>
                    <td>{day.date.slice(8, 10)}/{day.date.slice(5, 7)}</td>
                    <td>{WEEKDAYS[new Date(day.date).getDay()]}</td>
                    <td>
                      {day.isHoliday && <span className="ts-chip ts-chip-holiday">{day.holidayName}</span>}
                      {day.reports.map((r) => (
                        <span className="ts-chip" key={r.id}>
                          {REPORT_TYPE_LABEL[r.reportType] ?? r.reportType}
                          {r.reportType === "PRESENCE" && r.entryTime && r.exitTime
                            ? ` ${r.entryTime.slice(0, 5)}–${r.exitTime.slice(0, 5)}`
                            : ""}
                          {r.workType ? ` · ${r.workType.replace("_", " ")}` : ""}
                        </span>
                      ))}
                    </td>
                    <td>{formatMinutes(day.totalWorkedMinutes)}</td>
                    <td>{formatMinutes(day.standardMinutes)}</td>
                    <td>{formatMinutes(day.regularMinutes)}</td>
                    <td>{day.overtime125Minutes > 0 ? formatMinutes(day.overtime125Minutes) : "—"}</td>
                    <td>{day.overtime150Minutes > 0 ? formatMinutes(day.overtime150Minutes) : "—"}</td>
                    <td className={day.deltaMinutes < 0 ? "ts-negative" : day.deltaMinutes > 0 ? "ts-positive" : ""}>
                      {day.deltaMinutes >= 0 ? "+" : ""}{formatMinutes(day.deltaMinutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ts-summary">
            <div className="ts-summary-block">
              <span className="ts-summary-label">Worked / Standard</span>
              <span className="ts-summary-value">{formatMinutes(calendar.totalWorkedMinutes)} / {formatMinutes(calendar.totalStandardMinutes)}</span>
            </div>
            <div className="ts-summary-block">
              <span className="ts-summary-label">Regular</span>
              <span className="ts-summary-value">{formatMinutes(calendar.totalRegularMinutes)}</span>
            </div>
            <div className="ts-summary-block">
              <span className="ts-summary-label">OT 125% / 150%</span>
              <span className="ts-summary-value">{formatMinutes(calendar.totalOvertime125Minutes)} / {formatMinutes(calendar.totalOvertime150Minutes)}</span>
            </div>
            <div className="ts-summary-block">
              <span className="ts-summary-label">Surplus / Deficit</span>
              <span className={"ts-summary-value " + (calendar.totalDeltaMinutes < 0 ? "ts-negative" : "ts-positive")}>
                {calendar.totalDeltaMinutes >= 0 ? "+" : ""}{formatMinutes(calendar.totalDeltaMinutes)}
              </span>
            </div>
            {Object.entries(dayTypeCounts).map(([type, count]) => (
              <div className="ts-summary-block" key={type}>
                <span className="ts-summary-label">{REPORT_TYPE_LABEL[type] ?? type} days</span>
                <span className="ts-summary-value">{count}</span>
              </div>
            ))}
          </div>

          <div className="ts-actions">
            {isSelf && (lock?.status === "OPEN" || lock?.status === "REJECTED") && (
              <button type="button" className="btn btn-primary" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
                <Lock size={15} /> {submitMutation.isPending ? "Submitting…" : "Submit month for approval"}
              </button>
            )}
            {!isSelf && canApprove && lock?.status === "SUBMITTED" && (
              <>
                <button type="button" className="btn btn-primary" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                  <Send size={15} /> {approveMutation.isPending ? "Approving…" : "Approve month"}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReject(true)}>
                  Send back
                </button>
              </>
            )}
          </div>
        </>
      )}

      {showReject && (
        <Modal
          title="Send month back"
          onClose={() => setShowReject(false)}
          width={420}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowReject(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
                {rejectMutation.isPending ? "Sending…" : "Send back"}
              </button>
            </>
          }
        >
          <label className="field field-span-2">
            <span>Reason</span>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </label>
        </Modal>
      )}
    </Layout>
  );
}
