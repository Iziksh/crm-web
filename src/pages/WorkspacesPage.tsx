import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Minus } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field } from "../components/FormField";
import {
  fetchWorkspaces,
  createWorkspace,
  deleteWorkspace,
  addWorkspaceMember,
  removeWorkspaceMember,
  type WorkspaceResponse,
} from "../api/workspaces";
import { fetchAllUsers } from "../api/users";
import "./WorkspacesPage.css";

export function WorkspacesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<WorkspaceResponse | null>(null);
  const [addUsername, setAddUsername] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

  const { data: workspaces, isLoading, isError } = useQuery({ queryKey: ["workspaces"], queryFn: fetchWorkspaces });
  const { data: allUsers } = useQuery({ queryKey: ["all-users"], queryFn: () => fetchAllUsers() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  const createMutation = useMutation({ mutationFn: createWorkspace, onSuccess: () => { invalidate(); setShowModal(false); setName(""); setDescription(""); } });
  const deleteMutation = useMutation({
    mutationFn: deleteWorkspace,
    onSuccess: () => { invalidate(); setSelected(null); },
  });
  const addMemberMutation = useMutation({
    mutationFn: (vars: { workspaceId: number; userId: number }) => addWorkspaceMember(vars.workspaceId, vars.userId),
    onSuccess: (updated) => { invalidate(); setSelected(updated); setAddUsername(""); setMemberError(null); },
  });
  const removeMemberMutation = useMutation({
    mutationFn: (vars: { workspaceId: number; userId: number }) => removeWorkspaceMember(vars.workspaceId, vars.userId),
    onSuccess: (updated) => { invalidate(); setSelected(updated); },
  });

  function handleAddMember() {
    const u = allUsers?.find((u) => u.username === addUsername.trim());
    if (!u) {
      setMemberError(`No user found with username "${addUsername.trim()}"`);
      return;
    }
    addMemberMutation.mutate({ workspaceId: selected!.id, userId: u.id });
  }

  function handleRemoveMember(username: string) {
    const u = allUsers?.find((u) => u.username === username);
    if (!u) return;
    removeMemberMutation.mutate({ workspaceId: selected!.id, userId: u.id });
  }

  const columns: Column<WorkspaceResponse>[] = [
    { header: "Name", render: (w) => <strong>{w.name}</strong> },
    { header: "Slug", render: (w) => w.slug },
    { header: "Members", render: (w) => w.memberCount },
  ];

  return (
    <Layout title="Workspaces" subtitle="Companies (tenants) using this CRM.">
      <ListToolbar addLabel="New workspace" onAdd={() => setShowModal(true)} />

      {isLoading && <p>Loading workspaces…</p>}
      {isError && <p>Couldn't load workspaces.</p>}
      {workspaces && (
        <DataTable
          columns={columns}
          rows={workspaces}
          keyFn={(w) => w.id}
          onDelete={(w) => deleteMutation.mutate(w.id)}
          onRowClick={setSelected}
          isSelected={(w) => selected?.id === w.id}
        />
      )}

      {selected && (
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h3>Members of {selected.name}</h3>
          </div>
          <div className="workspace-members">
            {selected.memberNames.map((username) => (
              <div className="workspace-member-row" key={username}>
                <span>{username}</span>
                <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleRemoveMember(username)}>
                  <Minus size={14} />
                </button>
              </div>
            ))}
            <div className="workspace-add-member">
              <input
                placeholder="Username to add"
                value={addUsername}
                onChange={(e) => setAddUsername(e.target.value)}
              />
              <button type="button" className="btn btn-primary btn-small" onClick={handleAddMember} disabled={!addUsername.trim()}>
                Add
              </button>
            </div>
            {memberError && <p className="workspace-member-error">{memberError}</p>}
          </div>
        </div>
      )}

      {showModal && (
        <Modal
          title="New workspace"
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => createMutation.mutate({ name, description })} disabled={!name.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Name" value={name} onChange={setName} required span2 />
            <Field label="Description" value={description} onChange={setDescription} span2 />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
