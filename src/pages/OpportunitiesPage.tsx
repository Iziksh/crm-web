import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { Board, type BoardGroup } from "../components/Board";
import type { Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { OPPORTUNITY_STAGE_META } from "../lib/statusMeta";
import { Pencil, Trash2 } from "lucide-react";
import {
  fetchOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  type OpportunityResponse,
  type OpportunityRequest,
  type OpportunityStage,
} from "../api/opportunities";
import { fetchAccounts } from "../api/accounts";

const GROUP_ORDER: OpportunityStage[] = ["PROSPECTING", "QUALIFICATION", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

const EMPTY: OpportunityRequest = {
  name: "",
  stage: "PROSPECTING",
  amount: null,
  currency: "USD",
  probability: null,
  closeDate: "",
  notes: "",
  accountId: null,
  contactId: null,
};

const STAGE_OPTIONS = GROUP_ORDER.map((s) => ({ value: s, label: OPPORTUNITY_STAGE_META[s].label }));

function formatMoney(value: number | null, currency: string | null) {
  if (value == null) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 0 });
}

function groupOpportunities(rows: OpportunityResponse[]): BoardGroup<OpportunityResponse>[] {
  const buckets = new Map<OpportunityStage, OpportunityResponse[]>();
  for (const stage of GROUP_ORDER) buckets.set(stage, []);
  for (const o of rows) buckets.get(o.stage)?.push(o);
  return GROUP_ORDER.map((stage) => ({
    key: stage,
    label: OPPORTUNITY_STAGE_META[stage].label,
    tone: OPPORTUNITY_STAGE_META[stage].tone,
    rows: buckets.get(stage) ?? [],
  }));
}

export function OpportunitiesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<OpportunityResponse | null>(null);
  const [form, setForm] = useState<OpportunityRequest>(EMPTY);

  const { data: opportunities, isLoading, isError } = useQuery({ queryKey: ["opportunities"], queryFn: fetchOpportunities });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["opportunities"] });
  const createMutation = useMutation({ mutationFn: createOpportunity, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: OpportunityRequest }) => updateOpportunity(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteOpportunity, onSuccess: invalidate });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(o: OpportunityResponse) {
    setEditing(o);
    setForm({
      name: o.name,
      stage: o.stage,
      amount: o.amount,
      currency: o.currency ?? "USD",
      probability: o.probability,
      closeDate: o.closeDate ?? "",
      notes: "",
      accountId: o.accountId,
      contactId: o.contactId,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (editing) updateMutation.mutate({ id: editing.id, req: form });
    else createMutation.mutate(form);
  }

  const columns: Column<OpportunityResponse>[] = [
    { header: "Opportunity", render: (o) => <strong>{o.name}</strong> },
    { header: "Account", render: (o) => o.accountName ?? "—" },
    { header: "Assigned to", render: (o) => o.assignedToName ?? "—" },
    { header: "Amount", render: (o) => formatMoney(o.amount, o.currency) },
    { header: "Close date", render: (o) => o.closeDate ?? "—" },
    {
      header: "Actions",
      width: "70px",
      render: (o) => (
        <span className="data-table-actions">
          <button type="button" className="icon-btn" onClick={() => openEdit(o)} aria-label="Edit">
            <Pencil size={15} />
          </button>
          <button type="button" className="icon-btn icon-btn-danger" onClick={() => deleteMutation.mutate(o.id)} aria-label="Delete">
            <Trash2 size={15} />
          </button>
        </span>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Opportunities" subtitle="Deals in progress through your sales pipeline.">
      <ListToolbar addLabel="Add opportunity" onAdd={openCreate} />

      {isLoading && <p>Loading opportunities…</p>}
      {isError && <p>Couldn't load opportunities.</p>}
      {opportunities && opportunities.length === 0 && <p>No opportunities yet.</p>}
      {opportunities && opportunities.length > 0 && (
        <Board groups={groupOpportunities(opportunities)} columns={columns} keyFn={(o) => o.id} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit opportunity" : "New opportunity"}
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
            <SelectField label="Stage" value={form.stage} onChange={(v) => setForm({ ...form, stage: v })} options={STAGE_OPTIONS} />
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
            <Field
              label="Amount"
              type="number"
              value={form.amount?.toString() ?? ""}
              onChange={(v) => setForm({ ...form, amount: v ? Number(v) : null })}
            />
            <Field
              label="Probability (%)"
              type="number"
              value={form.probability?.toString() ?? ""}
              onChange={(v) => setForm({ ...form, probability: v ? Number(v) : null })}
            />
            <Field label="Close date" type="date" value={form.closeDate} onChange={(v) => setForm({ ...form, closeDate: v })} />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
