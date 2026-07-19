import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { AttachmentPanel } from "../components/AttachmentPanel";
import { AddonsPanel } from "../components/AddonsPanel";
import { StatusPill } from "../components/StatusPill";
import { ACCOUNT_TYPE_META, addonMeta } from "../lib/statusMeta";
import { useAccountScope } from "../context/AccountScopeContext";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  importAccounts,
  exportAccounts,
  type AccountResponse,
  type AccountRequest,
  type AccountType,
  type AccountAddonSummary,
} from "../api/accounts";
import "./AccountsPage.css";

const EMPTY: AccountRequest = {
  name: "",
  industry: "",
  website: "",
  phone: "",
  email: "",
  address: "",
  type: "",
  notes: "",
};

const TYPE_OPTIONS = Object.entries(ACCOUNT_TYPE_META).map(([value, meta]) => ({ value: value as AccountType, label: meta.label }));

/** An addon counts as active while it has no expiry date or expires today or later. */
function activeAddons(addons: AccountAddonSummary[]) {
  const today = new Date().toISOString().slice(0, 10);
  return addons.filter((a) => !a.expiryDate || a.expiryDate >= today);
}

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AccountResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "addons">("details");
  const [form, setForm] = useState<AccountRequest>(EMPTY);

  const { accountId: scopedAccountId } = useAccountScope();

  const { data: accounts, isLoading, isError } = useQuery({
    queryKey: ["accounts", search, scopedAccountId],
    queryFn: () => fetchAccounts(search, scopedAccountId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["accounts"] });

  const createMutation = useMutation({ mutationFn: createAccount, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: AccountRequest }) => updateAccount(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteAccount, onSuccess: invalidate });
  const importMutation = useMutation({
    mutationFn: importAccounts,
    onSuccess: (result) => {
      invalidate();
      const errorSummary = result.errors.length ? `\n\n${result.errors.join("\n")}` : "";
      window.alert(`Imported ${result.imported}, skipped ${result.skipped}.${errorSummary}`);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setActiveTab("details");
    setShowModal(true);
  }

  function openEdit(account: AccountResponse) {
    setEditing(account);
    setForm({
      name: account.name,
      industry: account.industry ?? "",
      website: account.website ?? "",
      phone: account.phone ?? "",
      email: account.email ?? "",
      address: account.address ?? "",
      type: account.type ?? "",
      notes: account.notes ?? "",
    });
    setActiveTab("details");
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<AccountResponse>[] = [
    { header: "Name", render: (a) => <strong>{a.name}</strong> },
    { header: "Industry", render: (a) => a.industry ?? "—" },
    { header: "Type", render: (a) => (a.type ? <StatusPill label={ACCOUNT_TYPE_META[a.type].label} tone={ACCOUNT_TYPE_META[a.type].tone} /> : "—") },
    {
      header: "Add-ons",
      width: "1.4fr",
      render: (a) => {
        const active = activeAddons(a.addons);
        if (active.length === 0) return "—";
        return (
          <span className="account-addons">
            {active.map((addon) => (
              <StatusPill key={addon.id} label={addon.name} tone={addonMeta(addon.name).tone} />
            ))}
          </span>
        );
      },
    },
    { header: "Email", render: (a) => a.email ?? "—" },
    { header: "Phone", render: (a) => a.phone ?? "—" },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Accounts" subtitle="Companies and organizations you do business with.">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search accounts…"
        addLabel="Add account"
        onAdd={openCreate}
        onImport={(file) => importMutation.mutate(file)}
        importing={importMutation.isPending}
        onExport={() => exportAccounts(search)}
      />

      {isLoading && <p>Loading accounts…</p>}
      {isError && <p>Couldn't load accounts.</p>}
      {accounts && (
        <DataTable columns={columns} rows={accounts} keyFn={(a) => a.id} onEdit={openEdit} onDelete={(a) => deleteMutation.mutate(a.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit account" : "New account"}
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
          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
            <button
              type="button"
              className={`modal-tab ${activeTab === "addons" ? "active" : ""}`}
              onClick={() => setActiveTab("addons")}
            >
              Addons
            </button>
          </div>

          {activeTab === "details" ? (
            <>
              <div className="modal-form-grid">
                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
                <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPE_OPTIONS} />
                <Field label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
                <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} span2 />
                <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} span2 />
              </div>
              <AttachmentPanel entityType="ACCOUNT" entityId={editing?.id ?? null} />
            </>
          ) : (
            <AddonsPanel accountId={editing?.id ?? null} />
          )}
        </Modal>
      )}
    </Layout>
  );
}
