import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { AttachmentPanel } from "../components/AttachmentPanel";
import { StatusPill } from "../components/StatusPill";
import { CONTACT_STATUS_META } from "../lib/statusMeta";
import {
  fetchContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  exportContacts,
  type ContactResponse,
  type ContactRequest,
  type ContactStatus,
} from "../api/contacts";
import { fetchAccounts } from "../api/accounts";
import { useAccountScope } from "../context/AccountScopeContext";

const EMPTY: ContactRequest = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  company: "",
  status: "",
  notes: "",
  accountId: null,
};

const STATUS_OPTIONS = Object.entries(CONTACT_STATUS_META).map(([value, meta]) => ({ value: value as ContactStatus, label: meta.label }));

export function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ContactResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ContactRequest>(EMPTY);

  const { accountId: scopedAccountId } = useAccountScope();

  const { data: contacts, isLoading, isError } = useQuery({
    queryKey: ["contacts", search, scopedAccountId],
    queryFn: () => fetchContacts(search, scopedAccountId),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["contacts"] });
  const createMutation = useMutation({ mutationFn: createContact, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: ContactRequest }) => updateContact(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteContact, onSuccess: invalidate });
  const importMutation = useMutation({
    mutationFn: importContacts,
    onSuccess: (result) => {
      invalidate();
      const errorSummary = result.errors.length ? `\n\n${result.errors.join("\n")}` : "";
      window.alert(`Imported ${result.imported}, skipped ${result.skipped}.${errorSummary}`);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(contact: ContactResponse) {
    setEditing(contact);
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone ?? "",
      jobTitle: contact.jobTitle ?? "",
      department: contact.department ?? "",
      company: contact.company ?? "",
      status: contact.status ?? "",
      notes: contact.notes ?? "",
      accountId: contact.accountId,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<ContactResponse>[] = [
    { header: "Name", render: (c) => <strong>{c.firstName} {c.lastName}</strong> },
    { header: "Account", render: (c) => c.accountName ?? "—" },
    { header: "Email", render: (c) => c.email },
    { header: "Title", render: (c) => c.jobTitle ?? "—" },
    { header: "Status", render: (c) => (c.status ? <StatusPill label={CONTACT_STATUS_META[c.status].label} tone={CONTACT_STATUS_META[c.status].tone} /> : "—") },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Contacts" subtitle="People at the accounts you work with.">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search contacts…"
        addLabel="Add contact"
        onAdd={openCreate}
        onImport={(file) => importMutation.mutate(file)}
        importing={importMutation.isPending}
        onExport={() => exportContacts(search)}
      />

      {isLoading && <p>Loading contacts…</p>}
      {isError && <p>Couldn't load contacts.</p>}
      {contacts && (
        <DataTable columns={columns} rows={contacts} keyFn={(c) => c.id} onEdit={openEdit} onDelete={(c) => deleteMutation.mutate(c.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit contact" : "New contact"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.firstName.trim() || !form.email.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="First name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
            <Field label="Last name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
            <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Job title" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
            <Field label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUS_OPTIONS} />
            <label className="field">
              <span>Belongs to Account</span>
              <select
                value={form.accountId ?? ""}
                onChange={(e) => setForm({ ...form, accountId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} span2 />
          </div>
          <AttachmentPanel entityType="CONTACT" entityId={editing?.id ?? null} />
        </Modal>
      )}
    </Layout>
  );
}
