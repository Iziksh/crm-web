import { useQuery } from "@tanstack/react-query";
import { Mail, Building2, Calendar } from "lucide-react";
import { Layout } from "../components/Layout";
import { Avatar } from "../components/Avatar";
import { StatusPill } from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { fetchWorkspaces } from "../api/workspaces";
import "./MyProfilePage.css";

const ROLE_LABELS: Record<string, string> = {
  ROLE_SUPER_ADMIN: "Super Admin",
  ROLE_COMPANY_ADMIN: "Company Admin",
  ROLE_ADMIN: "Admin",
  ROLE_SALES: "Sales",
  ROLE_SUPPORT: "Support",
  ROLE_USER: "User",
};

export function MyProfilePage() {
  const { user } = useAuth();
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: fetchWorkspaces, enabled: !!user?.workspaceId });
  const workspace = workspaces?.find((w) => w.id === user?.workspaceId);

  if (!user) return null;

  return (
    <Layout title="My profile" subtitle="Your account details and roles.">
      <div className="profile-card">
        <div className="profile-header">
          <Avatar name={user.username} size={64} />
          <div>
            <h2>{user.username}</h2>
            {user.status && <StatusPill label={user.status} tone={user.status === "ACTIVE" ? "green" : "gray"} />}
          </div>
        </div>

        <div className="profile-details">
          <div className="profile-row">
            <Mail size={16} />
            <span className="profile-label">Email</span>
            <span>{user.email}</span>
          </div>
          {workspace && (
            <div className="profile-row">
              <Building2 size={16} />
              <span className="profile-label">Workspace</span>
              <span>{workspace.name} ({workspace.slug})</span>
            </div>
          )}
          {user.createdAt && (
            <div className="profile-row">
              <Calendar size={16} />
              <span className="profile-label">Member since</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="profile-roles">
          <h4>Roles</h4>
          <div className="profile-roles-list">
            {user.roles.map((r) => (
              <span className="profile-role-badge" key={r}>{ROLE_LABELS[r] ?? r.replace("ROLE_", "")}</span>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
