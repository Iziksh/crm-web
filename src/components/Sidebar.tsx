import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutGrid, Building2, Layers, Contact2, MapPin, Bug, LifeBuoy, CalendarDays, Users2, TrendingUp,
  FileSignature, Truck, ScrollText, BarChart3, Package, UserCircle, Building, Bookmark, Bell,
  UserCog, Clock, Clock3, CalendarClock, ClipboardCheck, Receipt, FileStack, ChevronDown,
  LogOut, Table2, Gauge, type LucideIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasEffectiveRole } from "../lib/roles";
import { Avatar } from "./Avatar";
import "./Sidebar.css";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  requiresAdmin?: boolean;
}

interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Contacts",
    icon: Users2,
    items: [
      { to: "/accounts", label: "Accounts", icon: Building2 },
      { to: "/account-groups", label: "Account Groups", icon: Layers },
      { to: "/contacts", label: "Contacts", icon: Contact2 },
      { to: "/addresses", label: "Addresses", icon: MapPin },
    ],
  },
  {
    label: "Support",
    icon: LifeBuoy,
    items: [
      { to: "/activities", label: "Activities", icon: Bug },
      { to: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Sales",
    icon: TrendingUp,
    items: [
      { to: "/leads", label: "Leads", icon: Users2 },
      { to: "/opportunities", label: "Opportunities", icon: TrendingUp },
      { to: "/quotes", label: "Quotes", icon: FileSignature },
      { to: "/sales-orders", label: "Sales Orders", icon: Truck },
      { to: "/contracts", label: "Contracts", icon: ScrollText },
      { to: "/forecast", label: "Forecast", icon: BarChart3 },
      { to: "/products", label: "Products", icon: Package },
    ],
  },
  {
    label: "Settings",
    icon: UserCog,
    items: [
      { to: "/my-profile", label: "My Profile", icon: UserCircle },
      { to: "/workspaces", label: "Workspaces", icon: Building },
      { to: "/saved-searches", label: "Saved Searches", icon: Bookmark },
      { to: "/subscriptions", label: "Subscriptions", icon: Bell },
      { to: "/users", label: "Users", icon: UserCog, requiresAdmin: true },
      { to: "/scheduled-tasks", label: "Task Queue", icon: Clock, requiresAdmin: true },
    ],
  },
  {
    label: "HR",
    icon: Clock3,
    items: [
      { to: "/monthly-summary", label: "Monthly Summary", icon: Gauge },
      { to: "/time-clock", label: "Time Clock", icon: Clock3 },
      { to: "/timesheet", label: "Timesheet", icon: Table2 },
      { to: "/attendance-calendar", label: "Attendance Calendar", icon: CalendarClock },
      { to: "/attendance-corrections", label: "Corrections", icon: ClipboardCheck },
    ],
  },
  {
    label: "Billing & Documents",
    icon: Receipt,
    items: [
      { to: "/payment-requests", label: "Payment Requests", icon: Receipt },
      { to: "/tax-documents", label: "Tax Documents", icon: FileStack },
    ],
  },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isAdmin = hasEffectiveRole(user?.roles, "ROLE_ADMIN");

  // Each page mounts its own <Layout>/<Sidebar>, so this state resets on every navigation —
  // default every group to collapsed except whichever one contains the current route, so a
  // fresh mount doesn't render every section open at once.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of GROUPS) {
      const hasActive = group.items.some((i) => location.pathname.startsWith(i.to));
      initial[group.label] = !hasActive;
    }
    return initial;
  });
  function toggle(label: string) {
    setCollapsed((c) => ({ ...c, [label]: !c[label] }));
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">CRM</div>
        <span className="sidebar-brand-name">CRM</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}>
          <LayoutGrid size={18} strokeWidth={2} />
          <span>Dashboard</span>
        </NavLink>

        {GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.requiresAdmin || isAdmin);
          if (items.length === 0) return null;
          const isCollapsed = collapsed[group.label];
          const hasActiveChild = items.some((i) => location.pathname.startsWith(i.to));

          return (
            <div className="sidebar-group" key={group.label}>
              <button
                type="button"
                className={"sidebar-group-header" + (hasActiveChild ? " active" : "")}
                onClick={() => toggle(group.label)}
              >
                <group.icon size={18} strokeWidth={2} />
                <span>{group.label}</span>
                <ChevronDown size={15} className={"sidebar-chevron" + (isCollapsed ? " collapsed" : "")} />
              </button>

              {!isCollapsed && (
                <div className="sidebar-group-items">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => "sidebar-sublink" + (isActive ? " active" : "")}
                    >
                      <item.icon size={16} strokeWidth={2} />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <NavLink to="/my-profile" className={({ isActive }) => "sidebar-footer-profile" + (isActive ? " active" : "")}>
            <Avatar name={user.username} size={28} />
            <span className="sidebar-footer-username">{user.username}</span>
          </NavLink>
        )}
        <button className="sidebar-link sidebar-logout" title="Sign out" onClick={signOut}>
          <LogOut size={18} strokeWidth={2} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
