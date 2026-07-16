import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { fetchAddons, createAddon, updateAddon, deleteAddon, type AddonResponse, type AddonRequest } from "../api/addons";
import { useAuth } from "../context/AuthContext";
import { hasEffectiveRole } from "../lib/roles";
import { Modal } from "./Modal";
import { Field } from "./FormField";
import "./AddonsPanel.css";

const ADDON_CATALOG = ["Time Clock", "Billing & Documents"];
const EMPTY: AddonRequest = { name: "", description: "", expiryDate: "" };

export function AddonsPanel({ accountId }: { accountId: number | null }) {
  const { user } = useAuth();
  const isAdmin = hasEffectiveRole(user?.roles, "ROLE_ADMIN");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AddonResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddonRequest>(EMPTY);

  const { data: addons } = useQuery({
    queryKey: ["addons", accountId],
    queryFn: () => fetchAddons(accountId as number),
    enabled: accountId != null,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["addons", accountId] });
  const createMutation = useMutation({
    mutationFn: (req: AddonRequest) => createAddon(accountId as number, req),
    onSuccess: () => { invalidate(); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: AddonRequest }) => updateAddon(accountId as number, vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (addonId: number) => deleteAddon(accountId as number, addonId),
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(addon: AddonResponse) {
    setEditing(addon);
    setForm({ name: addon.name, description: addon.description ?? "", expiryDate: addon.expiryDate ?? "" });
    setShowForm(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  if (accountId == null) {
    return <p className="addons-empty">Save the account first to manage addons.</p>;
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="addons-panel">
      {isAdmin && (
        <button type="button" className="btn btn-primary btn-small" onClick={openCreate}>
          <Plus size={14} /> Add addon
        </button>
      )}

      {(!addons || addons.length === 0) && <p className="addons-empty">No addons yet.</p>}

      {addons && addons.length > 0 && (
        <div className="addons-table">
          <div className="addons-row addons-head">
            <span>Name</span>
            <span>Description</span>
            <span>Expiry date</span>
            {isAdmin && <span></span>}
          </div>
          {addons.map((a) => (
            <div className="addons-row" key={a.id}>
              <span>{a.name}</span>
              <span>{a.description ?? "—"}</span>
              <span>{a.expiryDate ?? "—"}</span>
              {isAdmin && (
                <span className="addons-actions">
                  <button type="button" className="icon-btn" onClick={() => openEdit(a)} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="icon-btn icon-btn-danger" onClick={() => deleteMutation.mutate(a.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title={editing ? "Edit addon" : "New addon"}
          onClose={() => setShowForm(false)}
          width={420}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <label className="field field-span-2">
              <span>Name</span>
              <input
                list="addon-catalog"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <datalist id="addon-catalog">
                {ADDON_CATALOG.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} span2 />
            <Field label="Expiry date" type="date" value={form.expiryDate} onChange={(v) => setForm({ ...form, expiryDate: v })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
