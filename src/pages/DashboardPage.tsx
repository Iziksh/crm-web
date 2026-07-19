import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Users, Trophy, CircleDollarSign } from "lucide-react";
import { fetchLeads } from "../api/leads";
import { useAuth } from "../context/AuthContext";
import { Layout } from "../components/Layout";
import "./DashboardPage.css";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: leads, isLoading, isError } = useQuery({ queryKey: ["leads"], queryFn: () => fetchLeads() });

  const stats = leads && [
    { label: "Total leads", value: leads.length, icon: Users, color: "var(--status-new)" },
    {
      label: "Won",
      value: leads.filter((l) => l.status === "WON").length,
      icon: Trophy,
      color: "var(--status-won)",
    },
    {
      label: "In progress",
      value: leads.filter((l) => l.status === "CONTACTED" || l.status === "QUALIFIED").length,
      icon: TrendingUp,
      color: "var(--status-contacted)",
    },
    {
      label: "Pipeline value",
      value: leads
        .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0)
        .toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
      icon: CircleDollarSign,
      color: "var(--status-qualified)",
    },
  ];

  return (
    <Layout title={`Welcome back, ${user?.username ?? "there"}`} subtitle="Here's what's happening with your pipeline today.">
      {isLoading && <p className="dash-status">Loading your data…</p>}
      {isError && <p className="dash-status dash-error">Couldn't load leads — is the backend running on :9080?</p>}

      {stats && (
        <div className="stat-grid">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon" style={{ background: color }}>
                <Icon size={18} color="white" strokeWidth={2.25} />
              </div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
