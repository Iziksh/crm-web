import { apiFetch, apiDownload } from "./client";

export type AttendanceApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type AttendanceReportType = "PRESENCE" | "VACATION" | "SICK" | "RESERVE_DUTY" | "HOLIDAY" | "ABSENCE";
export type WorkType = "OFFICE" | "WORK_FROM_HOME" | "FIELD_CLIENT" | "ON_CALL";

export interface AttendanceResponse {
  id: number;
  userId: number;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  note: string | null;
  source: string | null;
  approvalStatus: AttendanceApprovalStatus | null;
}

export function punchIn(note: string, force = false) {
  return apiFetch<AttendanceResponse>("/attendance/punch-in", {
    method: "POST",
    body: JSON.stringify({ note: note || null, source: "MANUAL", force }),
  });
}

export function punchOut() {
  return apiFetch<AttendanceResponse>("/attendance/punch-out", { method: "POST" });
}

/** Records a clock-out with no matching clock-in — an incomplete line with no total. */
export function createClockOutLine() {
  return apiFetch<AttendanceResponse>("/attendance/clock-out-line", { method: "POST" });
}

export async function fetchActiveSession(userId: number): Promise<AttendanceResponse | null> {
  const result = await apiFetch<AttendanceResponse | undefined>(`/attendance/active?userId=${userId}`);
  return result ?? null;
}

export function fetchMonthlyAttendance(userId: number, year: number, month: number) {
  return apiFetch<AttendanceResponse[]>(`/attendance/monthly?userId=${userId}&year=${year}&month=${month}`);
}

export function fetchPendingApprovals() {
  return apiFetch<AttendanceResponse[]>("/attendance/pending-approvals");
}

export interface CorrectionLogEntryResponse {
  id: number;
  userId: number;
  employeeName: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  note: string | null;
  source: string | null;
  approvalStatus: AttendanceApprovalStatus;
  approvedBy: number | null;
  approverName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export function fetchCorrections(filters: { from?: string; to?: string; status?: AttendanceApprovalStatus }) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return apiFetch<CorrectionLogEntryResponse[]>(`/attendance/corrections${qs ? `?${qs}` : ""}`);
}

export function approveAttendance(id: number) {
  return apiFetch<AttendanceResponse>(`/attendance/${id}/approve`, { method: "POST" });
}

export function rejectAttendance(id: number, reason: string) {
  return apiFetch<AttendanceResponse>(`/attendance/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}

export interface AttendanceReportResponse {
  id: number;
  userId: number;
  reportDate: string;
  entryTime: string | null;
  exitTime: string | null;
  durationFormatted: string | null;
  note: string | null;
  reportType: AttendanceReportType;
  workType: WorkType | null;
  projectTag: string | null;
}

export interface AttendanceReportRequest {
  reportDate: string;
  entryTime: string | null;
  exitTime: string | null;
  note: string;
  reportType: AttendanceReportType;
  equateToStandard: boolean;
  workType: WorkType | null;
  projectTag: string;
}

export function createAttendanceReport(req: AttendanceReportRequest) {
  return apiFetch<AttendanceReportResponse>("/attendance-reports", { method: "POST", body: JSON.stringify(req) });
}

export function updateAttendanceReport(id: number, req: AttendanceReportRequest) {
  return apiFetch<AttendanceReportResponse>(`/attendance-reports/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteAttendanceReport(id: number) {
  return apiFetch<void>(`/attendance-reports/${id}`, { method: "DELETE" });
}

export interface DayCalendarEntry {
  date: string;
  reports: AttendanceReportResponse[];
  totalWorkedMinutes: number;
  standardMinutes: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName: string | null;
  deltaMinutes: number;
  regularMinutes: number;
  overtime125Minutes: number;
  overtime150Minutes: number;
}

export interface MonthlyCalendarResponse {
  userId: number;
  username: string;
  year: number;
  month: number;
  days: DayCalendarEntry[];
  totalWorkedMinutes: number;
  totalStandardMinutes: number;
  totalDeltaMinutes: number;
  totalRegularMinutes: number;
  totalOvertime125Minutes: number;
  totalOvertime150Minutes: number;
}

export function fetchMonthlyCalendar(userId: number, year: number, month: number) {
  return apiFetch<MonthlyCalendarResponse>(`/attendance-reports/calendar?userId=${userId}&year=${year}&month=${month}`);
}

export interface MonthlySummaryResponse {
  userId: number;
  username: string;
  year: number;
  month: number;
  standardDays: number;
  actualDays: number;
  totalWorkedMinutes: number;
  totalStandardMinutes: number;
  totalDeltaMinutes: number;
  totalRegularMinutes: number;
  totalOvertime125Minutes: number;
  totalOvertime150Minutes: number;
  attendancePercent: number | null;
}

export function fetchMonthlySummary(userId: number, year: number, month: number) {
  return apiFetch<MonthlySummaryResponse>(`/attendance-reports/summary?userId=${userId}&year=${year}&month=${month}`);
}

export function exportDailyDetail(userId: number, year: number, month: number) {
  return apiDownload(`/attendance-reports/export/daily?userId=${userId}&year=${year}&month=${month}`, `timesheet-${year}-${month}.csv`);
}

export function exportMonthlySummaryCsv(userId: number, year: number, month: number) {
  return apiDownload(`/attendance-reports/export/monthly-summary?userId=${userId}&year=${year}&month=${month}`, `monthly-summary-${year}-${month}.csv`);
}

export function exportAbsences(userId: number, year: number, month: number) {
  return apiDownload(`/attendance-reports/export/absences?userId=${userId}&year=${year}&month=${month}`, `absences-${year}-${month}.csv`);
}

export type MonthLockStatus = "OPEN" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface MonthLockResponse {
  userId: number;
  year: number;
  month: number;
  status: MonthLockStatus;
  submittedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
}

export function fetchMonthLockStatus(userId: number, year: number, month: number) {
  return apiFetch<MonthLockResponse>(`/attendance-month-lock?userId=${userId}&year=${year}&month=${month}`);
}

export function submitMonthLock(year: number, month: number) {
  return apiFetch<MonthLockResponse>(`/attendance-month-lock/submit?year=${year}&month=${month}`, { method: "POST" });
}

export function approveMonthLock(userId: number, year: number, month: number) {
  return apiFetch<MonthLockResponse>(`/attendance-month-lock/approve?userId=${userId}&year=${year}&month=${month}`, { method: "POST" });
}

export function rejectMonthLock(userId: number, year: number, month: number, reason: string) {
  return apiFetch<MonthLockResponse>(`/attendance-month-lock/reject?userId=${userId}&year=${year}&month=${month}`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export interface HolidayResponse {
  id: number;
  date: string;
  name: string;
  creditHours: number;
}

export function fetchHolidays(year: number) {
  return apiFetch<HolidayResponse[]>(`/holidays?year=${year}`);
}
