import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import {
  fetchContracts,
  createContract,
  updateContract,
  deleteContract,
  type ContractResponse,
  type ContractRequest,
  type ContractStatus,
} from "../api/contracts";
import { fetchAccounts } from "../api/accounts";
import { fetchContacts } from "../api/contacts";
import { fetchSalesOrders } from "../api/salesOrders";

const STATUS_OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRED", label: "Expired" },
  { value: "TERMINATED", label: "Terminated" },
];

const STATUS_TONE: Record<ContractStatus, "gray" | "green" | "red" | "orange"> = {
  DRAFT: "gray",
  ACTIVE: "green",
  EXPIRED: "red",
  TERMINATED: "orange",
};

const EMPTY: ContractRequest = {
  title: "",
  status: "DRAFT",
  startDate: "",
  endDate: "",
  totalValue: null,
  currency: "USD",
  description: "",
  terms: "",
  salesOrderId: null,
  accountId: null,
  contactId: null,
};

export function ContractsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ContractResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ContractRequest>(EMPTY);

  const { data: contracts, isLoading, isError } = useQuery({ queryKey: ["contracts"], queryFn: fetchContracts });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });
  const { data: contacts } = useQuery({ queryKey: ["contacts", ""], queryFn: () => fetchContacts("") });
  const { data: orders } = useQuery({ queryKey: ["sales-orders"], queryFn: fetchSalesOrders });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["contracts"] });
  const createMutation = useMutation({ mutationFn: createContract, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: ContractRequest }) => updateContract(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteContract, onSuccess: invalidate });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(c: ContractResponse) {
    setEditing(c);
    setForm({
      title: c.title,
      status: c.status,
      startDate: c.startDate ?? "",
      endDate: c.endDate ?? "",
      totalValue: c.totalValue,
      currency: c.currency ?? "USD",
      description: "",
      terms: "",
      salesOrderId: c.salesOrderId,
      accountId: c.accountId,
      contactId: c.contactId,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<ContractResponse>[] = [
    { header: "Contract #", render: (c) => c.contractNumber, width: "0.7fr" },
    { header: "Title", render: (c) => <strong>{c.title}</strong> },
    { header: "Account", render: (c) => c.accountName ?? "—" },
    { header: "Status", render: (c) => <StatusPill label={c.status} tone={STATUS_TONE[c.status]} /> },
    { header: "Value", render: (c) => (c.totalValue != null ? `${c.currency ?? ""} ${c.totalValue}` : "—") },
    { header: "End date", render: (c) => c.endDate ?? "—" },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Contracts" subtitle="Signed agreements governing ongoing customer relationships.">
      <ListToolbar addLabel="New contract" onAdd={openCreate} />

      {isLoading && <p>Loading contracts…</p>}
      {isError && <p>Couldn't load contracts.</p>}
      {contracts && (
        <DataTable columns={columns} rows={contracts} keyFn={(c) => c.id} onEdit={openEdit} onDelete={(c) => deleteMutation.mutate(c.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit contract" : "New contract"}
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
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUS_OPTIONS} />
            <Field
              label="Total value"
              type="number"
              value={form.totalValue?.toString() ?? ""}
              onChange={(v) => setForm({ ...form, totalValue: v ? Number(v) : null })}
            />
            <Field label="Start date" type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
            <Field label="End date" type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
            <label className="field">
              <span>Account</span>
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
            <label className="field field-span-2">
              <span>Sales order (optional)</span>
              <select
                value={form.salesOrderId ?? ""}
                onChange={(e) => setForm({ ...form, salesOrderId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None</option>
                {orders?.map((o) => (
                  <option key={o.id} value={o.id}>{o.orderNumber}</option>
                ))}
              </select>
            </label>
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} span2 />
            <Field label="Terms" value={form.terms} onChange={(v) => setForm({ ...form, terms: v })} span2 />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
