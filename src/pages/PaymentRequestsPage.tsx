import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, XCircle, ArrowRightLeft, FileText } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import { InlineLineItems, EMPTY_LINE_ITEM, type InlineLineItem } from "../components/InlineLineItems";
import {
  fetchPaymentRequests,
  createPaymentRequest,
  updatePaymentRequest,
  cancelPaymentRequest,
  convertPaymentRequest,
  downloadPdf,
  type PaymentRequestResponse,
  type DocumentType,
} from "../api/billing";
import { fetchAccounts } from "../api/accounts";

const CONVERT_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "TAX_INVOICE", label: "Tax invoice" },
  { value: "TAX_INVOICE_RECEIPT", label: "Tax invoice + receipt" },
  { value: "RECEIPT", label: "Receipt" },
];

interface FormState {
  accountId: number | null;
  currency: string;
  documentDate: string;
  freeText: string;
  lineItems: InlineLineItem[];
}

const EMPTY: FormState = { accountId: null, currency: "USD", documentDate: "", freeText: "", lineItems: [{ ...EMPTY_LINE_ITEM }] };

export function PaymentRequestsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PaymentRequestResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertTarget, setConvertTarget] = useState<DocumentType>("TAX_INVOICE");
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: requests, isLoading, isError } = useQuery({ queryKey: ["payment-requests"], queryFn: fetchPaymentRequests });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
  const createMutation = useMutation({ mutationFn: createPaymentRequest, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: Parameters<typeof updatePaymentRequest>[1] }) => updatePaymentRequest(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const cancelMutation = useMutation({ mutationFn: cancelPaymentRequest, onSuccess: invalidate });
  const convertMutation = useMutation({
    mutationFn: (vars: { id: number; target: DocumentType }) => convertPaymentRequest(vars.id, vars.target),
    onSuccess: () => { invalidate(); setConvertingId(null); },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(p: PaymentRequestResponse) {
    setEditing(p);
    setForm({
      accountId: p.accountId,
      currency: p.currency ?? "USD",
      documentDate: p.documentDate ?? "",
      freeText: p.freeText ?? "",
      lineItems: p.lineItems.map((li) => ({
        productOrService: li.productOrService,
        description: li.description ?? "",
        quantity: li.quantity.toString(),
        unitPrice: li.unitPrice.toString(),
      })),
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.accountId) return;
    const req = {
      accountId: form.accountId,
      currency: form.currency,
      documentDate: form.documentDate,
      freeText: form.freeText,
      lineItems: form.lineItems
        .filter((li) => li.productOrService.trim())
        .map((li) => ({
          productOrService: li.productOrService,
          description: li.description,
          quantity: Number(li.quantity) || 0,
          unitPrice: Number(li.unitPrice) || 0,
        })),
    };
    if (editing) updateMutation.mutate({ id: editing.id, req });
    else createMutation.mutate(req);
  }

  const columns: Column<PaymentRequestResponse>[] = [
    { header: "Number", render: (p) => p.number, width: "0.8fr" },
    { header: "Account", render: (p) => p.accountName ?? "—" },
    { header: "Status", render: (p) => <StatusPill label={p.status} tone={p.status === "OPEN" ? "blue" : p.status === "CONVERTED" ? "green" : "gray"} /> },
    { header: "Total", render: (p) => `${p.currency ?? ""} ${p.totalAmount}` },
    {
      header: "Actions",
      width: "170px",
      render: (p) => (
        <span className="data-table-actions">
          <button type="button" className="icon-btn" title="Open Document" onClick={() => navigate(`/payment-request-document/${p.id}`)}>
            <FileText size={15} />
          </button>
          <button type="button" className="icon-btn" title="Download PDF" onClick={() => downloadPdf("PAYMENT_REQUEST", p.id)}>
            <Download size={15} />
          </button>
          {p.status === "OPEN" && (
            <>
              <button type="button" className="icon-btn" title="Convert" onClick={() => setConvertingId(p.id)}>
                <ArrowRightLeft size={15} />
              </button>
              <button type="button" className="icon-btn icon-btn-danger" title="Cancel" onClick={() => cancelMutation.mutate(p.id)}>
                <XCircle size={15} />
              </button>
            </>
          )}
        </span>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Payment requests" subtitle="Requests for payment, convertible into tax invoices or receipts.">
      <ListToolbar addLabel="New payment request" onAdd={openCreate} />

      {isLoading && <p>Loading payment requests…</p>}
      {isError && <p>Couldn't load payment requests.</p>}
      {requests && (
        <DataTable columns={columns} rows={requests} keyFn={(p) => p.id} onEdit={(p) => (p.status === "OPEN" ? openEdit(p) : undefined)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit payment request" : "New payment request"}
          onClose={() => setShowModal(false)}
          width={640}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.accountId}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <label className="field">
              <span>Account</span>
              <select
                value={form.accountId ?? ""}
                onChange={(e) => setForm({ ...form, accountId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">Select…</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <Field label="Currency" value={form.currency} onChange={(v) => setForm({ ...form, currency: v })} />
            <Field label="Document date" type="date" value={form.documentDate} onChange={(v) => setForm({ ...form, documentDate: v })} />
            <Field label="Notes" value={form.freeText} onChange={(v) => setForm({ ...form, freeText: v })} />
            <InlineLineItems items={form.lineItems} onChange={(lineItems) => setForm({ ...form, lineItems })} />
          </div>
        </Modal>
      )}

      {convertingId != null && (
        <Modal
          title="Convert to tax document"
          onClose={() => setConvertingId(null)}
          width={380}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConvertingId(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => convertMutation.mutate({ id: convertingId, target: convertTarget })}
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending ? "Converting…" : "Convert"}
              </button>
            </>
          }
        >
          <SelectField label="Target document type" value={convertTarget} onChange={setConvertTarget} options={CONVERT_OPTIONS} span2 />
        </Modal>
      )}
    </Layout>
  );
}
