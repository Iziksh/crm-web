import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { hasCompanyWideAttendanceAccess } from "../lib/roles";
import { StatusPill } from "../components/StatusPill";
import { ATTENDANCE_REPORT_TYPE_META } from "../lib/statusMeta";
import { fetchMonthlyCalendar } from "../api/timetracking";
import { fetchAllUsers } from "../api/users";
import "./AttendanceCalendarPage.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMinutes(mins: number) {
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

export function AttendanceCalendarPage() {
  const { user } = useAuth();
  const isAdmin = hasCompanyWideAttendanceAccess(user?.roles);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: allUsers } = useQuery({ queryKey: ["all-users"], queryFn: () => fetchAllUsers(), enabled: isAdmin });
  const targetUserId = isAdmin ? selectedUserId : user?.id ?? null;

  const { data: calendar, isLoading, isError } = useQuery({
    queryKey: ["attendance-calendar", targetUserId, cursor.year, cursor.month],
    queryFn: () => fetchMonthlyCalendar(targetUserId!, cursor.year, cursor.month),
    enabled: !!targetUserId,
  });

  function navigate(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }

  const firstDay = calendar ? new Date(calendar.year, calendar.month - 1, 1) : null;
  const leadingBlanks = firstDay ? firstDay.getDay() : 0;

  return (
    <Layout title="Attendance calendar" subtitle="Monthly view of work hours, leave, and holidays." rtlToggle>
      {isAdmin && (
        <div className="cal-user-picker">
          <select value={selectedUserId ?? ""} onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Select employee…</option>
            {allUsers?.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
      )}

      {isAdmin && !targetUserId && <p>Select an employee to view their calendar.</p>}

      {targetUserId && (
        <>
          <div className="cal-nav">
            <button type="button" className="icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
            <span className="cal-month-label">{cursor.year}-{cursor.month.toString().padStart(2, "0")}</span>
            <button type="button" className="icon-btn" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
          </div>

          {isLoading && <p>Loading calendar…</p>}
          {isError && <p>Couldn't load calendar.</p>}

          {calendar && (
            <>
              <div className="cal-grid">
                {WEEKDAYS.map((d) => (
                  <div className="cal-header-cell" key={d}>{d}</div>
                ))}
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                  <div className="cal-empty-cell" key={`b${i}`} />
                ))}
                {calendar.days.map((day) => (
                  <div
                    className={"cal-day-cell" + (day.isWeekend ? " cal-weekend" : "") + (day.isHoliday ? " cal-holiday" : "")}
                    key={day.date}
                  >
                    <div className="cal-day-number">{Number(day.date.slice(8, 10))}</div>
                    {day.reports.length > 0 && (
                      <div className="cal-day-reports">
                        {day.reports.map((r) => (
                          <div className="cal-day-report" key={r.id}>
                            {r.reportType === "PRESENCE" && r.entryTime && r.exitTime
                              ? `${r.entryTime.slice(0, 5)}–${r.exitTime.slice(0, 5)}`
                              : <StatusPill
                                  label={ATTENDANCE_REPORT_TYPE_META[r.reportType]?.label ?? r.reportType}
                                  tone={ATTENDANCE_REPORT_TYPE_META[r.reportType]?.tone ?? "gray"}
                                />}
                          </div>
                        ))}
                      </div>
                    )}
                    {day.totalWorkedMinutes > 0 && <div className="cal-day-total">{formatMinutes(day.totalWorkedMinutes)}</div>}
                    {day.isHoliday && day.holidayName && <div className="cal-holiday-name">{day.holidayName}</div>}
                  </div>
                ))}
              </div>
              <div className="cal-total-line">
                Worked {formatMinutes(calendar.totalWorkedMinutes)} / standard {formatMinutes(calendar.totalStandardMinutes)} (
                {calendar.totalDeltaMinutes >= 0 ? "+" : "-"}{formatMinutes(calendar.totalDeltaMinutes)})
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
