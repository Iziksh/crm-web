import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  toggleAddress,
  type AddressResponse,
  type AddressRequest,
  type AddressType,
} from "../api/addresses";
import { fetchAccounts } from "../api/accounts";
import { fetchContacts } from "../api/contacts";

const TYPE_OPTIONS: { value: AddressType; label: string }[] = [
  { value: "HOME", label: "Home" },
  { value: "WORK", label: "Work" },
  { value: "BILLING", label: "Billing" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "OTHER", label: "Other" },
];

const EMPTY: AddressRequest = {
  type: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  accountId: null,
  contactId: null,
};

export function AddressesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AddressResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AddressRequest>(EMPTY);

  const { data: addresses, isLoading, isError } = useQuery({ queryKey: ["addresses"], queryFn: fetchAddresses });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });
  const { data: contacts } = useQuery({ queryKey: ["contacts", ""], queryFn: () => fetchContacts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["addresses"] });
  const createMutation = useMutation({ mutationFn: createAddress, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: AddressRequest }) => updateAddress(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteAddress, onSuccess: invalidate });
  const toggleMutation = useMutation({ mutationFn: toggleAddress, onSuccess: invalidate });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(a: AddressResponse) {
    setEditing(a);
    setForm({
      type: a.type ?? "",
      street: a.street ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      postalCode: a.postalCode ?? "",
      country: a.country ?? "",
      accountId: a.accountId,
      contactId: a.contactId,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<AddressResponse>[] = [
    { header: "Type", render: (a) => a.type ?? "—" },
    { header: "Street", render: (a) => a.street ?? "—" },
    { header: "City", render: (a) => a.city ?? "—" },
    { header: "Country", render: (a) => a.country ?? "—" },
    { header: "Linked to", render: (a) => a.accountName ?? a.contactName ?? "—" },
    {
      header: "Status",
      render: (a) => (
        <button type="button" className="pill-toggle" onClick={() => toggleMutation.mutate(a.id)}>
          <StatusPill label={a.enabled ? "Active" : "Disabled"} tone={a.enabled ? "green" : "gray"} />
        </button>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Addresses" subtitle="Physical addresses linked to accounts and contacts.">
      <ListToolbar addLabel="Add address" onAdd={openCreate} />

      {isLoading && <p>Loading addresses…</p>}
      {isError && <p>Couldn't load addresses.</p>}
      {addresses && (
        <DataTable columns={columns} rows={addresses} keyFn={(a) => a.id} onEdit={openEdit} onDelete={(a) => deleteMutation.mutate(a.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit address" : "New address"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <SelectField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPE_OPTIONS} />
            <Field label="Street" value={form.street} onChange={(v) => setForm({ ...form, street: v })} span2 />
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <Field label="Postal code" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
            <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            <label className="field">
              <span>Account</span>
              <select
                value={form.accountId ?? ""}
                onChange={(e) => setForm({ ...form, accountId: e.target.value ? Number(e.target.value) : null, contactId: null })}
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
                onChange={(e) => setForm({ ...form, contactId: e.target.value ? Number(e.target.value) : null, accountId: null })}
              >
                <option value="">None</option>
                {contacts?.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </label>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
