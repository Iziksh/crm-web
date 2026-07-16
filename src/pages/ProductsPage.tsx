import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  toggleProduct,
  type ProductResponse,
  type ProductRequest,
  type ProductCategory,
} from "../api/products";

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: "SOFTWARE", label: "Software" },
  { value: "HARDWARE", label: "Hardware" },
  { value: "SERVICE", label: "Service" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "CONSULTING", label: "Consulting" },
  { value: "OTHER", label: "Other" },
];

const EMPTY: ProductRequest = { sku: "", name: "", description: "", category: "", unitPrice: 0, currency: "USD" };

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ProductRequest>(EMPTY);

  const { data: products, isLoading, isError } = useQuery({ queryKey: ["products", search], queryFn: () => fetchProducts(search) });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const createMutation = useMutation({ mutationFn: createProduct, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: ProductRequest }) => updateProduct(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const toggleMutation = useMutation({ mutationFn: toggleProduct, onSuccess: invalidate });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(p: ProductResponse) {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      description: p.description ?? "",
      category: p.category ?? "",
      unitPrice: p.unitPrice,
      currency: p.currency ?? "USD",
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<ProductResponse>[] = [
    { header: "SKU", render: (p) => p.sku, width: "0.6fr" },
    { header: "Name", render: (p) => <strong>{p.name}</strong> },
    { header: "Category", render: (p) => p.category ?? "—" },
    { header: "Price", render: (p) => p.unitPrice.toLocaleString(undefined, { style: "currency", currency: p.currency ?? "USD" }) },
    {
      header: "Status",
      render: (p) => (
        <button
          type="button"
          className="pill-toggle"
          onClick={() => toggleMutation.mutate(p.id)}
          title={p.active ? "Click to deactivate" : "Click to activate"}
        >
          <StatusPill label={p.active ? "Active" : "Inactive"} tone={p.active ? "green" : "gray"} />
        </button>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Products" subtitle="Your catalog of sellable products and services.">
      <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search products…" addLabel="Add product" onAdd={openCreate} />

      {isLoading && <p>Loading products…</p>}
      {isError && <p>Couldn't load products.</p>}
      {products && (
        <DataTable columns={columns} rows={products} keyFn={(p) => p.id} onEdit={openEdit} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit product" : "New product"}
          onClose={() => setShowModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.sku.trim() || !form.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="SKU" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} required />
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <SelectField label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORY_OPTIONS} />
            <Field
              label="Unit price"
              type="number"
              value={form.unitPrice.toString()}
              onChange={(v) => setForm({ ...form, unitPrice: Number(v) || 0 })}
            />
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} span2 />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
