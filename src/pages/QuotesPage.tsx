import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import { LineItemsPanel } from "../components/LineItemsPanel";
import {
  fetchQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
  addQuoteLineItem,
  removeQuoteLineItem,
  convertQuoteToOrder,
  type QuoteResponse,
  type QuoteRequest,
  type QuoteStatus,
} from "../api/quotes";
import { fetchAccounts } from "../api/accounts";
import { useAccountScope } from "../context/AccountScopeContext";
import { fetchContacts } from "../api/contacts";
import { fetchProducts } from "../api/products";

const STATUS_OPTIONS: { value: QuoteStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "EXPIRED", label: "Expired" },
];

const STATUS_TONE: Record<QuoteStatus, "gray" | "blue" | "green" | "red" | "orange"> = {
  DRAFT: "gray",
  SENT: "blue",
  WON: "green",
  LOST: "red",
  EXPIRED: "orange",
};

const EMPTY: QuoteRequest = {
  title: "",
  status: "DRAFT",
  validUntil: "",
  currency: "USD",
  notes: "",
  opportunityId: null,
  accountId: null,
  contactId: null,
};

export function QuotesPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<QuoteResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<QuoteResponse | null>(null);
  const [form, setForm] = useState<QuoteRequest>(EMPTY);

  const { accountId: scopedAccountId } = useAccountScope();
  const { data: quotes, isLoading, isError } = useQuery({
    queryKey: ["quotes", scopedAccountId],
    queryFn: () => fetchQuotes(scopedAccountId),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });
  const { data: contacts } = useQuery({ queryKey: ["contacts", ""], queryFn: () => fetchContacts("") });
  const { data: products } = useQuery({ queryKey: ["products", ""], queryFn: () => fetchProducts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["quotes"] });
  const createMutation = useMutation({ mutationFn: createQuote, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: QuoteRequest }) => updateQuote(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteQuote,
    onSuccess: () => { invalidate(); setSelected(null); },
  });
  const convertMutation = useMutation({ mutationFn: convertQuoteToOrder, onSuccess: invalidate });

  const addLineItemMutation = useMutation({
    mutationFn: (vars: { id: number; req: Parameters<typeof addQuoteLineItem>[1] }) => addQuoteLineItem(vars.id, vars.req),
    onSuccess: (updated) => { invalidate(); setSelected(updated); },
  });
  const removeLineItemMutation = useMutation({
    mutationFn: (vars: { id: number; lineId: number }) => removeQuoteLineItem(vars.id, vars.lineId),
    onSuccess: (_data, vars) => {
      invalidate();
      setSelected((current) => (current ? { ...current, lineItems: current.lineItems.filter((li) => li.id !== vars.lineId) } : current));
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(q: QuoteResponse) {
    setEditing(q);
    setForm({
      title: q.title,
      status: q.status,
      validUntil: q.validUntil ?? "",
      currency: q.currency ?? "USD",
      notes: "",
      opportunityId: q.opportunityId,
      accountId: q.accountId,
      contactId: q.contactId,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<QuoteResponse>[] = [
    { header: "Quote #", render: (q) => q.quoteNumber, width: "0.7fr" },
    { header: "Title", render: (q) => <strong>{q.title}</strong> },
    { header: "Account", render: (q) => q.accountName ?? "—" },
    { header: "Status", render: (q) => <StatusPill label={q.status} tone={STATUS_TONE[q.status]} /> },
    { header: "Total", render: (q) => (q.totalAmount != null ? `${q.currency ?? ""} ${q.totalAmount}` : "—") },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Quotes" subtitle="Priced proposals sent to prospective customers.">
      <ListToolbar addLabel="New quote" onAdd={openCreate} />

      {isLoading && <p>Loading quotes…</p>}
      {isError && <p>Couldn't load quotes.</p>}
      {quotes && (
        <DataTable
          columns={columns}
          rows={quotes}
          keyFn={(q) => q.id}
          onEdit={openEdit}
          onDelete={(q) => deleteMutation.mutate(q.id)}
          onRowClick={setSelected}
          isSelected={(q) => selected?.id === q.id}
        />
      )}

      {selected && (
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h3>{selected.quoteNumber} — {selected.title}</h3>
            {selected.status === "WON" && (
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => convertMutation.mutate(selected.id)}
                disabled={convertMutation.isPending}
              >
                <ShoppingCart size={14} /> Convert to sales order
              </button>
            )}
          </div>
          <LineItemsPanel
            lineItems={selected.lineItems}
            products={products}
            adding={addLineItemMutation.isPending}
            onAdd={(item) => addLineItemMutation.mutate({ id: selected.id, req: item })}
            onRemove={(lineId) => removeLineItemMutation.mutate({ id: selected.id, lineId })}
          />
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit quote" : "New quote"}
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
            <Field label="Valid until" type="date" value={form.validUntil} onChange={(v) => setForm({ ...form, validUntil: v })} />
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
            <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} span2 />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
