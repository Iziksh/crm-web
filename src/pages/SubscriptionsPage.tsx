import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import {
  fetchSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  fetchTopics,
  type SubscriptionResponse,
  type SubscriptionRequest,
  type SubscriptionEventType,
} from "../api/subscriptions";
import "./SubscriptionsPage.css";

const EVENT_TYPES: SubscriptionEventType[] = ["OBJECT_CREATION", "OBJECT_REPLACEMENT", "OBJECT_REMOVAL"];

interface FormState {
  name: string;
  description: string;
  active: boolean;
  topicId: number | null;
  eventTypes: SubscriptionEventType[];
  filters: { name: string; value: string }[];
}

const EMPTY: FormState = {
  name: "",
  description: "",
  active: true,
  topicId: null,
  eventTypes: [],
  filters: [
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
    { name: "", value: "" },
  ],
};

export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SubscriptionResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: subscriptions, isLoading, isError } = useQuery({ queryKey: ["subscriptions"], queryFn: fetchSubscriptions });
  const { data: topics } = useQuery({ queryKey: ["topics"], queryFn: fetchTopics });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  const createMutation = useMutation({ mutationFn: createSubscription, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: SubscriptionRequest }) => updateSubscription(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const deleteMutation = useMutation({ mutationFn: deleteSubscription, onSuccess: invalidate });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(s: SubscriptionResponse) {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? "",
      active: s.active,
      topicId: s.topicId,
      eventTypes: s.eventTypes,
      filters: [0, 1, 2, 3, 4].map((i) => ({
        name: (s[`filterName${i}` as keyof SubscriptionResponse] as string) ?? "",
        value: (s[`filterValue${i}` as keyof SubscriptionResponse] as string) ?? "",
      })),
    });
    setShowModal(true);
  }

  function toggleEventType(type: SubscriptionEventType) {
    setForm((f) => ({
      ...f,
      eventTypes: f.eventTypes.includes(type) ? f.eventTypes.filter((t) => t !== type) : [...f.eventTypes, type],
    }));
  }

  function handleSave() {
    if (!form.topicId) return;
    const req: SubscriptionRequest = {
      name: form.name,
      description: form.description,
      active: form.active,
      topicId: form.topicId,
      eventTypes: form.eventTypes,
      filterName0: form.filters[0].name, filterValue0: form.filters[0].value,
      filterName1: form.filters[1].name, filterValue1: form.filters[1].value,
      filterName2: form.filters[2].name, filterValue2: form.filters[2].value,
      filterName3: form.filters[3].name, filterValue3: form.filters[3].value,
      filterName4: form.filters[4].name, filterValue4: form.filters[4].value,
    };
    if (editing) updateMutation.mutate({ id: editing.id, req });
    else createMutation.mutate(req);
  }

  const columns: Column<SubscriptionResponse>[] = [
    { header: "Name", render: (s) => <strong>{s.name}</strong> },
    { header: "Topic", render: (s) => s.topicName },
    { header: "Entity type", render: (s) => s.entityType },
    { header: "Status", render: (s) => <StatusPill label={s.active ? "Active" : "Inactive"} tone={s.active ? "green" : "gray"} /> },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Subscriptions" subtitle="Get notified when specific things happen to specific records.">
      <ListToolbar addLabel="New subscription" onAdd={openCreate} />

      {isLoading && <p>Loading subscriptions…</p>}
      {isError && <p>Couldn't load subscriptions.</p>}
      {subscriptions && (
        <DataTable columns={columns} rows={subscriptions} keyFn={(s) => s.id} onEdit={openEdit} onDelete={(s) => deleteMutation.mutate(s.id)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit subscription" : "New subscription"}
          onClose={() => setShowModal(false)}
          width={620}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim() || !form.topicId}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required span2 />
            <label className="field">
              <span>Topic</span>
              <select
                value={form.topicId ?? ""}
                onChange={(e) => setForm({ ...form, topicId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Select…</option>
                {topics?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.entityType})</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Active</span>
              <select value={form.active ? "true" : "false"} onChange={(e) => setForm({ ...form, active: e.target.value === "true" })}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>

            <div className="field field-span-2">
              <span>Event types</span>
              <div className="event-type-checkboxes">
                {EVENT_TYPES.map((type) => (
                  <label key={type} className="event-type-checkbox">
                    <input type="checkbox" checked={form.eventTypes.includes(type)} onChange={() => toggleEventType(type)} />
                    {type.replace("OBJECT_", "").toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} span2 />

            <div className="field field-span-2">
              <span>Filters (optional)</span>
              {form.filters.map((f, i) => (
                <div className="subscription-filter-row" key={i}>
                  <input
                    placeholder="Field name"
                    value={f.name}
                    onChange={(e) => {
                      const filters = [...form.filters];
                      filters[i] = { ...filters[i], name: e.target.value };
                      setForm({ ...form, filters });
                    }}
                  />
                  <input
                    placeholder="Value"
                    value={f.value}
                    onChange={(e) => {
                      const filters = [...form.filters];
                      filters[i] = { ...filters[i], value: e.target.value };
                      setForm({ ...form, filters });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
