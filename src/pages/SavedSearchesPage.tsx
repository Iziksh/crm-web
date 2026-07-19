import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill, type PillTone } from "../components/StatusPill";
import {
  fetchSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  executeSavedSearch,
  type SavedSearchResponse,
  type SavedSearchRequest,
  type SavedSearchScope,
} from "../api/savedSearches";

const SCOPE_OPTIONS: { value: SavedSearchScope; label: string }[] = [
  { value: "ACCOUNT", label: "Account" },
  { value: "CONTACT", label: "Contact" },
  { value: "ADDRESS", label: "Address" },
  { value: "LEAD", label: "Lead" },
  { value: "OPPORTUNITY", label: "Opportunity" },
  { value: "ACTIVITY", label: "Activity" },
];

const SCOPE_TONE: Record<string, PillTone> = {
  ACCOUNT: "blue",
  CONTACT: "purple",
  ADDRESS: "gray",
  LEAD: "orange",
  OPPORTUNITY: "green",
  ACTIVITY: "red",
};

const EMPTY: SavedSearchRequest = { name: "", scope: "", filterJson: "" };

export function SavedSearchesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SavedSearchResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SavedSearchRequest>(EMPTY);
  const [runResult, setRunResult] = useState<{ name: string; count: number } | null>(null);

  const { data: searches, isLoading, isError } = useQuery({ queryKey: ["saved-searches"], queryFn: fetchSavedSearches });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
  const createMutation = useMutation({ mutationFn: createSavedSearch, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: SavedSearchRequest }) => updateSavedSearch(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteSavedSearch, onSuccess: invalidate });
  const runMutation = useMutation({
    mutationFn: (s: SavedSearchResponse) => executeSavedSearch(s.id),
    onSuccess: (result, s) => setRunResult({ name: s.name, count: result.count }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(s: SavedSearchResponse) {
    setEditing(s);
    setForm({ name: s.name, scope: s.scope ?? "", filterJson: s.filterJson ?? "" });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<SavedSearchResponse>[] = [
    { header: "Name", render: (s) => <strong>{s.name}</strong> },
    { header: "Scope", render: (s) => s.scope ? <StatusPill label={s.scope} tone={SCOPE_TONE[s.scope] ?? "gray"} /> : "—" },
    {
      header: "Actions",
      width: "40px",
      render: (s) => (
        <button type="button" className="icon-btn" title="Run" onClick={() => runMutation.mutate(s)}>
          <Play size={15} />
        </button>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Saved searches" subtitle="Reusable filters you can run any time.">
      <ListToolbar addLabel="New search" onAdd={openCreate} />

      {isLoading && <p>Loading saved searches…</p>}
      {isError && <p>Couldn't load saved searches.</p>}
      {searches && (
        <DataTable columns={columns} rows={searches} keyFn={(s) => s.id} onEdit={openEdit} onDelete={(s) => deleteMutation.mutate(s.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit saved search" : "New saved search"}
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
            <SelectField label="Scope" value={form.scope} onChange={(v) => setForm({ ...form, scope: v })} options={SCOPE_OPTIONS} span2 />
            <label className="field field-span-2">
              <span>Filter JSON</span>
              <textarea
                rows={4}
                value={form.filterJson}
                onChange={(e) => setForm({ ...form, filterJson: e.target.value })}
                placeholder='{"status": "OPEN"}'
              />
            </label>
          </div>
        </Modal>
      )}

      {runResult && (
        <Modal title={`Results — ${runResult.name}`} onClose={() => setRunResult(null)} width={340}>
          <p>{runResult.count} matching record{runResult.count === 1 ? "" : "s"}.</p>
        </Modal>
      )}
    </Layout>
  );
}
