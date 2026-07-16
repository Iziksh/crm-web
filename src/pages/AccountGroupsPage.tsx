import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field } from "../components/FormField";
import {
  fetchAccountGroups,
  createAccountGroup,
  updateAccountGroup,
  deleteAccountGroup,
  type AccountGroupResponse,
  type AccountGroupRequest,
} from "../api/accountGroups";

const EMPTY: AccountGroupRequest = { name: "", description: "", parentId: null };

export function AccountGroupsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AccountGroupResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AccountGroupRequest>(EMPTY);

  const { data: groups, isLoading, isError } = useQuery({ queryKey: ["account-groups", search], queryFn: () => fetchAccountGroups(search) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["account-groups"] });
  const createMutation = useMutation({ mutationFn: createAccountGroup, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: AccountGroupRequest }) => updateAccountGroup(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteAccountGroup, onSuccess: invalidate });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(g: AccountGroupResponse) {
    setEditing(g);
    setForm({ name: g.name, description: g.description ?? "", parentId: g.parentId });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<AccountGroupResponse>[] = [
    { header: "Name", render: (g) => <strong>{g.name}</strong> },
    { header: "Parent group", render: (g) => g.parentName ?? "—" },
    { header: "Members", render: (g) => g.memberCount },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;
  const otherGroups = groups?.filter((g) => g.id !== editing?.id) ?? [];

  return (
    <Layout title="Account groups" subtitle="Organize accounts into hierarchical groups.">
      <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search groups…" addLabel="Add group" onAdd={openCreate} />

      {isLoading && <p>Loading account groups…</p>}
      {isError && <p>Couldn't load account groups.</p>}
      {groups && (
        <DataTable columns={columns} rows={groups} keyFn={(g) => g.id} onEdit={openEdit} onDelete={(g) => deleteMutation.mutate(g.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit account group" : "New account group"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required span2 />
            <label className="field field-span-2">
              <span>Parent group</span>
              <select
                value={form.parentId ?? ""}
                onChange={(e) => setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None</option>
                {otherGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} span2 />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
