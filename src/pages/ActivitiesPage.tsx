import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Check, RotateCcw, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { AttachmentPanel } from "../components/AttachmentPanel";
import { StatusPill } from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import {
  fetchActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  assignActivity,
  resolveActivity,
  reopenActivity,
  addActivityNote,
  type ActivityResponse,
  type ActivityRequest,
  type ActivityType,
  type ActivityStatus,
  type ActivityPriority,
} from "../api/activities";
import { fetchAccounts } from "../api/accounts";
import { fetchContacts } from "../api/contacts";
import "./ActivitiesPage.css";

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  "BUG", "FEATURE", "TASK", "MEETING", "CALL", "EMAIL", "SALES_VISIT", "MAILING", "SMS", "ABSENCE",
].map((t) => ({ value: t as ActivityType, label: t.replace("_", " ") }));

const STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const PRIORITY_OPTIONS: { value: ActivityPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const STATUS_TONE: Record<ActivityStatus, "blue" | "orange" | "green" | "gray"> = {
  OPEN: "blue",
  IN_PROGRESS: "orange",
  RESOLVED: "green",
  CLOSED: "gray",
};

const EMPTY: ActivityRequest = {
  title: "",
  description: "",
  type: "",
  status: "OPEN",
  priority: "MEDIUM",
  dueDate: "",
  assignedToId: null,
  accountId: null,
  contactId: null,
};

export function ActivitiesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ActivityResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notesFor, setNotesFor] = useState<ActivityResponse | null>(null);
  const [noteText, setNoteText] = useState("");
  const [form, setForm] = useState<ActivityRequest>(EMPTY);

  const { data: activities, isLoading, isError } = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });
  const { data: contacts } = useQuery({ queryKey: ["contacts", ""], queryFn: () => fetchContacts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["activities"] });
  const createMutation = useMutation({ mutationFn: createActivity, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: ActivityRequest }) => updateActivity(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteActivity, onSuccess: invalidate });
  const assignMutation = useMutation({ mutationFn: (id: number) => assignActivity(id, user!.username), onSuccess: invalidate });
  const resolveMutation = useMutation({ mutationFn: resolveActivity, onSuccess: invalidate });
  const reopenMutation = useMutation({ mutationFn: reopenActivity, onSuccess: invalidate });
  const addNoteMutation = useMutation({
    mutationFn: (vars: { id: number; text: string }) => addActivityNote(vars.id, vars.text),
    onSuccess: (note) => {
      invalidate();
      setNoteText("");
      setNotesFor((current) => (current ? { ...current, notes: [...current.notes, note] } : current));
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(a: ActivityResponse) {
    setEditing(a);
    setForm({
      title: a.title,
      description: a.description ?? "",
      type: a.type ?? "",
      status: a.status,
      priority: a.priority ?? "",
      dueDate: a.dueDate ?? "",
      assignedToId: a.assignedToId,
      accountId: a.accountId,
      contactId: a.contactId,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<ActivityResponse>[] = [
    { header: "Title", render: (a) => <strong>{a.title}</strong> },
    { header: "Type", render: (a) => a.type ?? "—" },
    { header: "Status", render: (a) => <StatusPill label={a.status.replace("_", " ")} tone={STATUS_TONE[a.status]} /> },
    { header: "Priority", render: (a) => a.priority ?? "—" },
    { header: "Assigned to", render: (a) => a.assignedToName ?? "—" },
    { header: "Due", render: (a) => a.dueDate ?? "—" },
    {
      header: "Actions",
      width: "150px",
      render: (a) => (
        <span className="data-table-actions">
          {a.status === "OPEN" && (
            <button type="button" className="icon-btn" title="Assign to me" onClick={() => assignMutation.mutate(a.id)}>
              <UserCheck size={15} />
            </button>
          )}
          {a.status !== "RESOLVED" && a.status !== "CLOSED" && (
            <button type="button" className="icon-btn" title="Resolve" onClick={() => resolveMutation.mutate(a.id)}>
              <Check size={15} />
            </button>
          )}
          {(a.status === "RESOLVED" || a.status === "CLOSED") && (
            <button type="button" className="icon-btn" title="Reopen" onClick={() => reopenMutation.mutate(a.id)}>
              <RotateCcw size={15} />
            </button>
          )}
          <button type="button" className="icon-btn" title="Notes" onClick={() => setNotesFor(a)}>
            <MessageSquare size={15} />
          </button>
          <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(a)}>
            <Pencil size={15} />
          </button>
          <button type="button" className="icon-btn icon-btn-danger" title="Delete" onClick={() => deleteMutation.mutate(a.id)}>
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Activities" subtitle="Tasks, calls, meetings and support work tracked against your accounts.">
      <ListToolbar addLabel="Add activity" onAdd={openCreate} />

      {isLoading && <p>Loading activities…</p>}
      {isError && <p>Couldn't load activities.</p>}
      {activities && (
        <DataTable columns={columns} rows={activities} keyFn={(a) => a.id} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit activity" : "New activity"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required span2 />
            <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPE_OPTIONS} />
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUS_OPTIONS} />
            <SelectField label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={PRIORITY_OPTIONS} />
            <Field label="Due date" type="date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} />
            <label className="field">
              <span>Account</span>
              <select
                value={form.accountId ?? ""}
                onChange={(e) => setForm({ ...form, accountId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None</option>
                {accounts?.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Contact</span>
              <select
                value={form.contactId ?? ""}
                onChange={(e) => setForm({ ...form, contactId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None</option>
                {contacts?.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </label>
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} span2 />
          </div>
          <AttachmentPanel entityType="ACTIVITY" entityId={editing?.id ?? null} />
        </Modal>
      )}

      {notesFor && (
        <Modal title={`Notes — ${notesFor.title}`} onClose={() => setNotesFor(null)}>
          {notesFor.notes.length === 0 && <p>No notes yet.</p>}
          {notesFor.notes.map((n) => (
            <div key={n.id} className="activity-note">
              <div className="activity-note-meta">{n.authorName} · {n.createdAt.replace("T", " ").slice(0, 16)}</div>
              <div>{n.text}</div>
            </div>
          ))}
          <div className="activity-note-form">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              rows={3}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={!noteText.trim() || addNoteMutation.isPending}
              onClick={() => addNoteMutation.mutate({ id: notesFor.id, text: noteText })}
            >
              Add note
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
