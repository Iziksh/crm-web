import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import { LineItemsPanel } from "../components/LineItemsPanel";
import {
  fetchSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  addSalesOrderLineItem,
  removeSalesOrderLineItem,
  convertSalesOrderToContract,
  type SalesOrderResponse,
  type SalesOrderRequest,
  type SalesOrderStatus,
} from "../api/salesOrders";
import { fetchAccounts } from "../api/accounts";
import { useAccountScope } from "../context/AccountScopeContext";
import { fetchContacts } from "../api/contacts";
import { fetchQuotes } from "../api/quotes";
import { fetchProducts } from "../api/products";

const STATUS_OPTIONS: { value: SalesOrderStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_TONE: Record<SalesOrderStatus, "gray" | "blue" | "green" | "red"> = {
  PENDING: "gray",
  CONFIRMED: "blue",
  DELIVERED: "green",
  CANCELLED: "red",
};

const EMPTY: SalesOrderRequest = {
  title: "",
  status: "PENDING",
  orderDate: "",
  deliveryDate: "",
  currency: "USD",
  notes: "",
  quoteId: null,
  accountId: null,
  contactId: null,
};

export function SalesOrdersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SalesOrderResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<SalesOrderResponse | null>(null);
  const [form, setForm] = useState<SalesOrderRequest>(EMPTY);

  const { accountId: scopedAccountId } = useAccountScope();
  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ["sales-orders", scopedAccountId],
    queryFn: () => fetchSalesOrders(scopedAccountId),
  });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });
  const { data: contacts } = useQuery({ queryKey: ["contacts", ""], queryFn: () => fetchContacts("") });
  const { data: quotes } = useQuery({ queryKey: ["quotes"], queryFn: () => fetchQuotes() });
  const { data: products } = useQuery({ queryKey: ["products", ""], queryFn: () => fetchProducts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
  const createMutation = useMutation({ mutationFn: createSalesOrder, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: SalesOrderRequest }) => updateSalesOrder(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteSalesOrder,
    onSuccess: () => { invalidate(); setSelected(null); },
  });
  const convertMutation = useMutation({ mutationFn: convertSalesOrderToContract, onSuccess: invalidate });

  const addLineItemMutation = useMutation({
    mutationFn: (vars: { id: number; req: Parameters<typeof addSalesOrderLineItem>[1] }) => addSalesOrderLineItem(vars.id, vars.req),
    onSuccess: (updated) => { invalidate(); setSelected(updated); },
  });
  const removeLineItemMutation = useMutation({
    mutationFn: (vars: { id: number; lineId: number }) => removeSalesOrderLineItem(vars.id, vars.lineId),
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

  function openEdit(o: SalesOrderResponse) {
    setEditing(o);
    setForm({
      title: o.orderNumber,
      status: o.status,
      orderDate: o.orderDate ?? "",
      deliveryDate: o.deliveryDate ?? "",
      currency: o.currency ?? "USD",
      notes: "",
      quoteId: o.quoteId,
      accountId: o.accountId,
      contactId: null,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<SalesOrderResponse>[] = [
    { header: "Order #", render: (o) => o.orderNumber, width: "0.7fr" },
    { header: "Account", render: (o) => o.accountName ?? "—" },
    { header: "Status", render: (o) => <StatusPill label={o.status} tone={STATUS_TONE[o.status]} /> },
    { header: "Total", render: (o) => (o.totalAmount != null ? `${o.currency ?? ""} ${o.totalAmount}` : "—") },
    { header: "Delivery date", render: (o) => o.deliveryDate ?? "—" },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Sales orders" subtitle="Confirmed orders being fulfilled and delivered.">
      <ListToolbar addLabel="New order" onAdd={openCreate} />

      {isLoading && <p>Loading sales orders…</p>}
      {isError && <p>Couldn't load sales orders.</p>}
      {orders && (
        <DataTable
          columns={columns}
          rows={orders}
          keyFn={(o) => o.id}
          onEdit={openEdit}
          onDelete={(o) => deleteMutation.mutate(o.id)}
          onRowClick={setSelected}
          isSelected={(o) => selected?.id === o.id}
        />
      )}

      {selected && (
        <div className="detail-panel">
          <div className="detail-panel-header">
            <h3>{selected.orderNumber}</h3>
            {selected.status === "DELIVERED" && (
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => convertMutation.mutate(selected.id)}
                disabled={convertMutation.isPending}
              >
                <FileText size={14} /> Convert to contract
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
          title={editing ? "Edit sales order" : "New sales order"}
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
            <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUS_OPTIONS} span2 />
            <Field label="Order date" type="date" value={form.orderDate} onChange={(v) => setForm({ ...form, orderDate: v })} />
            <Field label="Delivery date" type="date" value={form.deliveryDate} onChange={(v) => setForm({ ...form, deliveryDate: v })} />
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
              <span>Quote (optional)</span>
              <select
                value={form.quoteId ?? ""}
                onChange={(e) => setForm({ ...form, quoteId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">None</option>
                {quotes?.map((q) => (
                  <option key={q.id} value={q.id}>{q.quoteNumber}</option>
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
