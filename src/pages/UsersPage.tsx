import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Ban, CheckCircle, Shield, Trash2, Users, Pencil } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import { hasEffectiveRole } from "../lib/roles";
import { fetchWorkspaces, addWorkspaceMember } from "../api/workspaces";
import { fetchAllUsers, createUser, updateUser } from "../api/users";
import {
  fetchWorkspaceUsers,
  inviteUser,
  disableUser,
  enableUser,
  changeUserRole,
  changeUserManager,
  removeUser,
  type UserAdminResponse,
  type UserStatus,
} from "../api/admin";

const ROLE_OPTIONS = [
  { value: "ROLE_COMPANY_ADMIN", label: "Company admin" },
  { value: "ROLE_USER", label: "User" },
  { value: "ROLE_SALES", label: "Sales" },
  { value: "ROLE_SUPPORT", label: "Support" },
  { value: "ROLE_HR_MANAGER", label: "HR Manager (time/attendance only)" },
];

const STATUS_TONE = { INVITED: "gray", ACTIVE: "green", DISABLED: "orange" } as const;

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  // Admin-level roles see every user system-wide, not just their own workspace.
  const isSuperAdmin = hasEffectiveRole(currentUser?.roles, "ROLE_ADMIN");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("ROLE_USER");
  const [changingRoleFor, setChangingRoleFor] = useState<UserAdminResponse | null>(null);
  const [newRole, setNewRole] = useState("ROLE_USER");
  const [changingManagerFor, setChangingManagerFor] = useState<UserAdminResponse | null>(null);
  const [newManagerId, setNewManagerId] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "", email: "", password: "", role: "ROLE_USER", workspaceId: "", managerId: "",
  });
  const [editingUser, setEditingUser] = useState<UserAdminResponse | null>(null);
  const [editForm, setEditForm] = useState({ username: "", email: "", password: "" });

  // Super admins operate across every workspace (mirrors the Vaadin UsersView, which fetches all
  // users system-wide for this role instead of scoping to a single workspace). Fetched
  // unconditionally now — the super-admin "Add user" modal needs the workspace picker too.
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: fetchWorkspaces });
  const myWorkspace = workspaces?.find((w) => w.memberNames.includes(currentUser?.username ?? ""));

  const { data: workspaceUsers, isLoading: loadingWorkspaceUsers, isError: errorWorkspaceUsers } = useQuery({
    queryKey: ["workspace-users", myWorkspace?.id],
    queryFn: () => fetchWorkspaceUsers(myWorkspace!.id),
    enabled: !isSuperAdmin && !!myWorkspace,
  });

  const { data: allUsers, isLoading: loadingAllUsers, isError: errorAllUsers } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: fetchAllUsers,
    enabled: isSuperAdmin,
  });

  const users: UserAdminResponse[] | undefined = isSuperAdmin
    ? allUsers?.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        roles: u.roles,
        status: (u.enabled ? "ACTIVE" : "DISABLED") as UserStatus,
        workspaceId: null,
        managerId: u.managerId,
        managerName: u.managerName,
      }))
    : workspaceUsers;

  const isLoading = isSuperAdmin ? loadingAllUsers : loadingWorkspaceUsers;
  const isError = isSuperAdmin ? errorAllUsers : errorWorkspaceUsers;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["workspace-users"] });
    queryClient.invalidateQueries({ queryKey: ["all-users-admin"] });
  };
  const inviteMutation = useMutation({
    mutationFn: () => inviteUser(inviteEmail, inviteRole, myWorkspace!.id),
    onSuccess: () => { invalidate(); setShowInvite(false); setInviteEmail(""); },
  });
  const disableMutation = useMutation({ mutationFn: disableUser, onSuccess: invalidate });
  const enableMutation = useMutation({ mutationFn: enableUser, onSuccess: invalidate });
  const roleMutation = useMutation({
    mutationFn: (vars: { id: number; role: string }) => changeUserRole(vars.id, vars.role),
    onSuccess: () => { invalidate(); setChangingRoleFor(null); },
  });
  const removeMutation = useMutation({ mutationFn: removeUser, onSuccess: invalidate });
  const managerMutation = useMutation({
    mutationFn: (vars: { id: number; managerId: number | null }) => changeUserManager(vars.id, vars.managerId),
    onSuccess: () => { invalidate(); setChangingManagerFor(null); },
  });
  const createUserMutation = useMutation({
    mutationFn: async () => {
      const created = await createUser({
        username: newUser.username.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        roles: [newUser.role],
        managerId: newUser.managerId ? Number(newUser.managerId) : null,
      });
      if (newUser.workspaceId) {
        await addWorkspaceMember(Number(newUser.workspaceId), created.id);
      }
      return created;
    },
    onSuccess: () => {
      invalidate();
      setShowAddUser(false);
      setNewUser({ username: "", email: "", password: "", role: "ROLE_USER", workspaceId: "", managerId: "" });
    },
  });
  const updateUserMutation = useMutation({
    mutationFn: () => updateUser(editingUser!.id, {
      username: editForm.username.trim(),
      email: editForm.email.trim(),
      password: editForm.password,
      roles: editingUser!.roles,
      managerId: editingUser!.managerId,
    }),
    onSuccess: () => { invalidate(); setEditingUser(null); },
  });

  const columns: Column<UserAdminResponse>[] = [
    { header: "Username", render: (u) => <strong>{u.username}</strong> },
    { header: "Email", render: (u) => u.email },
    { header: "Roles", render: (u) => u.roles.map((r) => r.replace("ROLE_", "")).join(", ") },
    { header: "Manager", render: (u) => u.managerName ?? "—" },
    { header: "Status", render: (u) => <StatusPill label={u.status} tone={STATUS_TONE[u.status]} /> },
    {
      header: "Actions",
      width: "190px",
      render: (u) => {
        const isSelf = u.username === currentUser?.username;
        return (
          <span className="data-table-actions">
            {u.status === "INVITED" && u.workspaceId != null && (
              <button type="button" className="icon-btn" title="Resend invite" onClick={() => inviteUser(u.email, u.roles[0] ?? "ROLE_USER", u.workspaceId!).then(invalidate)}>
                <Mail size={15} />
              </button>
            )}
            {!isSelf && u.status === "ACTIVE" && (
              <button type="button" className="icon-btn" title="Disable" onClick={() => disableMutation.mutate(u.id)}>
                <Ban size={15} />
              </button>
            )}
            {!isSelf && u.status === "DISABLED" && (
              <button type="button" className="icon-btn" title="Enable" onClick={() => enableMutation.mutate(u.id)}>
                <CheckCircle size={15} />
              </button>
            )}
            <button
              type="button"
              className="icon-btn"
              title="Edit"
              onClick={() => { setEditingUser(u); setEditForm({ username: u.username, email: u.email, password: "" }); }}
            >
              <Pencil size={15} />
            </button>
            {!isSelf && (
              <button type="button" className="icon-btn" title="Change role" onClick={() => { setChangingRoleFor(u); setNewRole(u.roles[0] ?? "ROLE_USER"); }}>
                <Shield size={15} />
              </button>
            )}
            {!isSelf && (
              <button type="button" className="icon-btn" title="Assign manager" onClick={() => { setChangingManagerFor(u); setNewManagerId(u.managerId != null ? String(u.managerId) : ""); }}>
                <Users size={15} />
              </button>
            )}
            {!isSelf && (
              <button type="button" className="icon-btn icon-btn-danger" title="Remove" onClick={() => removeMutation.mutate(u.id)}>
                <Trash2 size={15} />
              </button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <Layout
      title="Users"
      subtitle={isSuperAdmin ? "Manage every user across every workspace." : "Manage who has access to your workspace."}
    >
      {!isSuperAdmin && <ListToolbar addLabel="Invite user" onAdd={() => setShowInvite(true)} />}
      {isSuperAdmin && <ListToolbar addLabel="Add user" onAdd={() => setShowAddUser(true)} />}

      {isLoading && <p>Loading users…</p>}
      {isError && <p>Couldn't load users.</p>}
      {!isSuperAdmin && !myWorkspace && workspaces && <p>No workspace found for your account.</p>}
      {users && <DataTable columns={columns} rows={users} keyFn={(u) => u.id} />}

      {showInvite && (
        <Modal
          title="Invite user"
          onClose={() => setShowInvite(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? "Sending…" : "Send invite"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Email" type="email" value={inviteEmail} onChange={setInviteEmail} span2 required />
            <SelectField label="Role" value={inviteRole} onChange={setInviteRole} options={ROLE_OPTIONS} span2 />
          </div>
        </Modal>
      )}

      {changingRoleFor && (
        <Modal
          title={`Change role — ${changingRoleFor.username}`}
          onClose={() => setChangingRoleFor(null)}
          width={360}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setChangingRoleFor(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={roleMutation.isPending}
                onClick={() => roleMutation.mutate({ id: changingRoleFor.id, role: newRole })}
              >
                {roleMutation.isPending ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <SelectField label="Role" value={newRole} onChange={setNewRole} options={ROLE_OPTIONS} span2 />
        </Modal>
      )}

      {changingManagerFor && (
        <Modal
          title={`Assign manager — ${changingManagerFor.username}`}
          onClose={() => setChangingManagerFor(null)}
          width={360}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setChangingManagerFor(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={managerMutation.isPending}
                onClick={() => managerMutation.mutate({
                  id: changingManagerFor.id,
                  managerId: newManagerId ? Number(newManagerId) : null,
                })}
              >
                {managerMutation.isPending ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <label className="field field-span-2">
            <span>Manager</span>
            <select value={newManagerId} onChange={(e) => setNewManagerId(e.target.value)}>
              <option value="">No manager</option>
              {users?.filter((u) => u.id !== changingManagerFor.id).map((u) => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </label>
        </Modal>
      )}

      {showAddUser && (
        <Modal
          title="Add user"
          onClose={() => setShowAddUser(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowAddUser(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!newUser.username.trim() || !newUser.email.trim() || createUserMutation.isPending}
                onClick={() => createUserMutation.mutate()}
              >
                {createUserMutation.isPending ? "Creating…" : "Create user"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Username" value={newUser.username} onChange={(v) => setNewUser({ ...newUser, username: v })} required />
            <Field label="Email" type="email" value={newUser.email} onChange={(v) => setNewUser({ ...newUser, email: v })} required />
            <Field
              label="Password"
              type="text"
              value={newUser.password}
              onChange={(v) => setNewUser({ ...newUser, password: v })}
              span2
            />
            <SelectField label="Role" value={newUser.role} onChange={(v) => setNewUser({ ...newUser, role: v })} options={ROLE_OPTIONS} />
            <label className="field">
              <span>Workspace</span>
              <select value={newUser.workspaceId} onChange={(e) => setNewUser({ ...newUser, workspaceId: e.target.value })}>
                <option value="">No workspace</option>
                {workspaces?.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className="field field-span-2">
              <span>Manager</span>
              <select value={newUser.managerId} onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value })}>
                <option value="">No manager</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>{u.username}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-hint" style={{ margin: "8px 2px 0" }}>Leave password blank to default to "changeme" — the employee should reset it on first login.</p>
        </Modal>
      )}

      {editingUser && (
        <Modal
          title={`Edit user — ${editingUser.username}`}
          onClose={() => setEditingUser(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!editForm.username.trim() || !editForm.email.trim() || updateUserMutation.isPending}
                onClick={() => updateUserMutation.mutate()}
              >
                {updateUserMutation.isPending ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Username" value={editForm.username} onChange={(v) => setEditForm({ ...editForm, username: v })} required />
            <Field label="Email" type="email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} required />
            <Field
              label="New password"
              type="text"
              value={editForm.password}
              onChange={(v) => setEditForm({ ...editForm, password: v })}
              span2
            />
          </div>
          <p className="field-hint" style={{ margin: "8px 2px 0" }}>Leave password blank to keep it unchanged. Role and manager are edited separately.</p>
        </Modal>
      )}
    </Layout>
  );
}
