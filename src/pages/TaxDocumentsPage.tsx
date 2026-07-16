import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, CheckCircle, CreditCard } from "lucide-react";
import { Layout } from "../components/Layout";
import { ListToolbar } from "../components/ListToolbar";
import { DataTable, type Column } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import { InlineLineItems, EMPTY_LINE_ITEM, type InlineLineItem } from "../components/InlineLineItems";
import {
  fetchTaxDocuments,
  createTaxDocument,
  updateTaxDocument,
  issueTaxDocument,
  addTaxDocumentPayment,
  downloadPdf,
  type TaxDocumentResponse,
  type DocumentType,
  type VatType,
  type DiscountType,
  type RoundingMode,
  type PaymentMethod,
} from "../api/billing";
import { fetchAccounts } from "../api/accounts";

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "TAX_INVOICE", label: "Tax invoice" },
  { value: "TAX_INVOICE_RECEIPT", label: "Tax invoice + receipt" },
  { value: "RECEIPT", label: "Receipt" },
  { value: "PROFORMA", label: "Proforma" },
  { value: "QUOTE", label: "Quote" },
  { value: "CREDIT_INVOICE", label: "Credit invoice" },
];

const VAT_OPTIONS: { value: VatType; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "ZERO", label: "Zero-rated" },
  { value: "EXEMPT", label: "Exempt" },
];

const DISCOUNT_OPTIONS: { value: DiscountType; label: string }[] = [
  { value: "PERCENT", label: "Percent" },
  { value: "AMOUNT", label: "Amount" },
];

const ROUNDING_OPTIONS: { value: RoundingMode; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "TO_AGOROT", label: "To agorot" },
  { value: "TO_SHEKEL", label: "To shekel" },
];

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];

interface FormState {
  documentType: DocumentType | "";
  accountId: number | null;
  currency: string;
  documentDate: string;
  freeText: string;
  vatType: VatType | "";
  discountType: DiscountType | "";
  discountValue: string;
  roundingMode: RoundingMode | "";
  lineItems: InlineLineItem[];
}

const EMPTY: FormState = {
  documentType: "",
  accountId: null,
  currency: "USD",
  documentDate: "",
  freeText: "",
  vatType: "STANDARD",
  discountType: "",
  discountValue: "",
  roundingMode: "NONE",
  lineItems: [{ ...EMPTY_LINE_ITEM }],
};

export function TaxDocumentsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TaxDocumentResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY);

  const { data: documents, isLoading, isError } = useQuery({ queryKey: ["tax-documents"], queryFn: fetchTaxDocuments });
  const { data: accounts } = useQuery({ queryKey: ["accounts", ""], queryFn: () => fetchAccounts("") });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tax-documents"] });
  const createMutation = useMutation({ mutationFn: createTaxDocument, onSuccess: () => { invalidate(); setShowModal(false); } });
  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; req: Parameters<typeof updateTaxDocument>[1] }) => updateTaxDocument(vars.id, vars.req),
    onSuccess: () => { invalidate(); setShowModal(false); },
  });
  const issueMutation = useMutation({ mutationFn: issueTaxDocument, onSuccess: invalidate });
  const paymentMutation = useMutation({
    mutationFn: (vars: { id: number; req: Parameters<typeof addTaxDocumentPayment>[1] }) => addTaxDocumentPayment(vars.id, vars.req),
    onSuccess: () => { invalidate(); setPayingId(null); setPaymentAmount(""); },
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  }

  function openEdit(d: TaxDocumentResponse) {
    setEditing(d);
    setForm({
      documentType: d.documentType,
      accountId: d.accountId,
      currency: d.currency ?? "USD",
      documentDate: d.documentDate ?? "",
      freeText: d.freeText ?? "",
      vatType: d.vatType ?? "STANDARD",
      discountType: d.discountType ?? "",
      discountValue: d.discountValue?.toString() ?? "",
      roundingMode: d.roundingMode ?? "NONE",
      lineItems: d.lineItems.map((li) => ({
        productOrService: li.productOrService,
        description: li.description ?? "",
        quantity: li.quantity.toString(),
        unitPrice: li.unitPrice.toString(),
      })),
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.accountId || !form.documentType) return;
    const req = {
      documentType: form.documentType,
      accountId: form.accountId,
      currency: form.currency,
      documentDate: form.documentDate,
      freeText: form.freeText,
      vatType: form.vatType,
      discountType: form.discountType,
      discountValue: form.discountValue ? Number(form.discountValue) : null,
      roundingMode: form.roundingMode,
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

  const columns: Column<TaxDocumentResponse>[] = [
    { header: "Number", render: (d) => d.number, width: "0.8fr" },
    { header: "Type", render: (d) => d.documentType.replace(/_/g, " ") },
    { header: "Account", render: (d) => d.accountName ?? "—" },
    { header: "Status", render: (d) => <StatusPill label={d.status} tone={d.status === "DRAFT" ? "gray" : d.status === "ISSUED" ? "green" : "red"} /> },
    { header: "Total", render: (d) => `${d.currency ?? ""} ${d.grossTotal ?? "—"}` },
    {
      header: "Actions",
      width: "140px",
      render: (d) => (
        <span className="data-table-actions">
          <button type="button" className="icon-btn" title="Download PDF" onClick={() => downloadPdf("TAX_DOCUMENT", d.id)}>
            <Download size={15} />
          </button>
          {d.status === "DRAFT" && (
            <button type="button" className="icon-btn" title="Issue" onClick={() => issueMutation.mutate(d.id)}>
              <CheckCircle size={15} />
            </button>
          )}
          {d.status === "ISSUED" && (
            <button type="button" className="icon-btn" title="Record payment" onClick={() => setPayingId(d.id)}>
              <CreditCard size={15} />
            </button>
          )}
        </span>
      ),
    },
  ];

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout title="Tax documents" subtitle="Invoices, receipts, and proformas issued to customers.">
      <ListToolbar addLabel="New tax document" onAdd={openCreate} />

      {isLoading && <p>Loading tax documents…</p>}
      {isError && <p>Couldn't load tax documents.</p>}
      {documents && (
        <DataTable columns={columns} rows={documents} keyFn={(d) => d.id} onEdit={(d) => (d.status === "DRAFT" ? openEdit(d) : undefined)} />
      )}

      {showModal && (
        <Modal
          title={editing ? "Edit tax document" : "New tax document"}
          onClose={() => setShowModal(false)}
          width={680}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.accountId || !form.documentType}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <SelectField label="Document type" value={form.documentType} onChange={(v) => setForm({ ...form, documentType: v })} options={DOC_TYPE_OPTIONS} />
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
            <SelectField label="VAT type" value={form.vatType} onChange={(v) => setForm({ ...form, vatType: v })} options={VAT_OPTIONS} />
            <SelectField label="Rounding" value={form.roundingMode} onChange={(v) => setForm({ ...form, roundingMode: v })} options={ROUNDING_OPTIONS} />
            <SelectField label="Discount type" value={form.discountType} onChange={(v) => setForm({ ...form, discountType: v })} options={DISCOUNT_OPTIONS} />
            <Field label="Discount value" type="number" value={form.discountValue} onChange={(v) => setForm({ ...form, discountValue: v })} />
            <Field label="Notes" value={form.freeText} onChange={(v) => setForm({ ...form, freeText: v })} span2 />
            <InlineLineItems items={form.lineItems} onChange={(lineItems) => setForm({ ...form, lineItems })} />
          </div>
        </Modal>
      )}

      {payingId != null && (
        <Modal
          title="Record payment"
          onClose={() => setPayingId(null)}
          width={380}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPayingId(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!paymentAmount || paymentMutation.isPending}
                onClick={() =>
                  paymentMutation.mutate({
                    id: payingId,
                    req: { paymentMethod, amount: Number(paymentAmount), receivedAt: new Date().toISOString().slice(0, 10) },
                  })
                }
              >
                {paymentMutation.isPending ? "Saving…" : "Add payment"}
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <SelectField label="Method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHOD_OPTIONS} span2 />
            <Field label="Amount" type="number" value={paymentAmount} onChange={setPaymentAmount} span2 />
          </div>
        </Modal>
      )}
    </Layout>
  );
}
