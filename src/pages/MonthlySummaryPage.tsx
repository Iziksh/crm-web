import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarCheck, Clock3, Scale, Gauge } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { hasCompanyWideAttendanceAccess } from "../lib/roles";
import { fetchMonthlySummary } from "../api/timetracking";
import { fetchAllUsers, fetchMyDirectReports } from "../api/users";
import "./MonthlySummaryPage.css";

function formatMinutes(mins: number) {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  return `${sign}${Math.floor(abs / 60)}:${(abs % 60).toString().padStart(2, "0")}`;
}

export function MonthlySummaryPage() {
  const { user } = useAuth();
  const isAdmin = hasCompanyWideAttendanceAccess(user?.roles);

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: allUsers } = useQuery({ queryKey: ["all-users"], queryFn: fetchAllUsers, enabled: isAdmin });
  const { data: directReports } = useQuery({ queryKey: ["my-direct-reports"], queryFn: fetchMyDirectReports });
  const pickerOptions = isAdmin ? allUsers : directReports;

  const targetUserId = selectedUserId ?? user?.id ?? null;

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["monthly-summary", targetUserId, cursor.year, cursor.month],
    queryFn: () => fetchMonthlySummary(targetUserId!, cursor.year, cursor.month),
    enabled: !!targetUserId,
  });

  function navigate(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });
  }

  const cards = summary && [
    {
      label: "Days worked",
      value: `${summary.actualDays} / ${summary.standardDays}`,
      icon: CalendarCheck,
      color: "var(--status-new)",
    },
    {
      label: "Hours worked",
      value: `${formatMinutes(summary.totalWorkedMinutes)} / ${formatMinutes(summary.totalStandardMinutes)}`,
      icon: Clock3,
      color: "var(--color-brand)",
    },
    {
      label: "Surplus / Deficit",
      value: `${summary.totalDeltaMinutes >= 0 ? "+" : ""}${formatMinutes(summary.totalDeltaMinutes)}`,
      icon: Scale,
      color: summary.totalDeltaMinutes < 0 ? "var(--status-lost)" : "var(--status-won)",
    },
    {
      label: "Attendance %",
      value: summary.attendancePercent != null ? `${summary.attendancePercent}%` : "—",
      icon: Gauge,
      color: "var(--status-qualified)",
    },
  ];

  return (
    <Layout title="Monthly Summary" subtitle="Your attendance at a glance for the month." rtlToggle>
      {pickerOptions && pickerOptions.length > 0 && (
        <div className="ms-user-picker">
          <select value={selectedUserId ?? ""} onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">My summary</option>
            {pickerOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>
      )}

      <div className="ms-nav">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
        <span className="ms-month-label">{cursor.year}-{cursor.month.toString().padStart(2, "0")}</span>
        <button type="button" className="icon-btn" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
      </div>

      {isLoading && <p>Loading summary…</p>}
      {isError && <p>Couldn't load summary.</p>}

      {cards && (
        <div className="ms-stat-grid">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div className="ms-stat-card" key={label}>
              <div className="ms-stat-icon" style={{ background: color }}>
                <Icon size={18} color="white" strokeWidth={2.25} />
              </div>
              <div className="ms-stat-value">{value}</div>
              <div className="ms-stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="ms-overtime-line">
          Regular {formatMinutes(summary.totalRegularMinutes)} · OT 125% {formatMinutes(summary.totalOvertime125Minutes)} · OT 150% {formatMinutes(summary.totalOvertime150Minutes)}
        </div>
      )}
    </Layout>
  );
}
