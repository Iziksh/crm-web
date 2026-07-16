import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageCircle, Printer, Download } from "lucide-react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Field } from "../components/FormField";
import { StatusPill } from "../components/StatusPill";
import { useAuth } from "../context/AuthContext";
import {
  fetchPaymentRequest,
  cancelPaymentRequest,
  convertPaymentRequest,
  downloadPdf,
  viewPdf,
  shareDocument,
  getWhatsAppLink,
  type DocumentType,
} from "../api/billing";
import { fetchWorkspaces } from "../api/workspaces";
import { fetchAccount, fetchAccountContacts } from "../api/accounts";
import "./PaymentRequestDocumentPage.css";


export function PaymentRequestDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const paymentRequestId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [emailModal, setEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [whatsappModal, setWhatsappModal] = useState(false);
  const [phone, setPhone] = useState("");

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ["payment-request", paymentRequestId],
    queryFn: () => fetchPaymentRequest(paymentRequestId),
  });
  const { data: workspaces } = useQuery({ queryKey: ["workspaces"], queryFn: fetchWorkspaces });
  const myWorkspace = workspaces?.find((w) => w.id === user?.workspaceId);

  const accountId = doc?.accountId ?? null;
  const { data: account } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => fetchAccount(accountId!),
    enabled: !!accountId,
  });
  const { data: accountContacts } = useQuery({
    queryKey: ["account-contacts", accountId],
    queryFn: () => fetchAccountContacts(accountId!),
    enabled: !!accountId,
  });

  const savedPhoneNumbers = [
    ...(account?.phone ? [{ label: `${account.name} (main)`, phone: account.phone }] : []),
    ...(accountContacts ?? [])
      .filter((c) => !!c.phone)
      .map((c) => ({ label: `${c.firstName} ${c.lastName}`, phone: c.phone as string })),
  ];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["payment-request", paymentRequestId] });
  const cancelMutation = useMutation({ mutationFn: () => cancelPaymentRequest(paymentRequestId), onSuccess: invalidate });
  const convertMutation = useMutation({
    mutationFn: (target: DocumentType) => convertPaymentRequest(paymentRequestId, target),
    onSuccess: invalidate,
  });
  const emailMutation = useMutation({
    mutationFn: () => shareDocument("PAYMENT_REQUEST", paymentRequestId, "EMAIL", email),
    onSuccess: () => { setEmailModal(false); setEmail(""); },
  });
  const whatsappMutation = useMutation({
    mutationFn: async () => {
      const res = await getWhatsAppLink("PAYMENT_REQUEST", paymentRequestId, phone);
      // WhatsApp's web/deep link can only pre-fill text, not attach a file — so download the PDF
      // here too, ready for the user to attach manually once WhatsApp opens.
      await downloadPdf("PAYMENT_REQUEST", paymentRequestId);
      return res;
    },
    onSuccess: (res) => { window.open(res.whatsappLink, "_blank"); setWhatsappModal(false); setPhone(""); },
  });

  if (isLoading) return <Layout title="Payment request"><p>Loading…</p></Layout>;
  if (isError || !doc) return <Layout title="Payment request"><p>Couldn't load this document.</p></Layout>;

  const taxStatus = myWorkspace?.taxStatus ?? null;
  const invoiceReceiptTarget: DocumentType = taxStatus === "EXEMPT_DEALER" ? "RECEIPT" : "TAX_INVOICE_RECEIPT";

  return (
    <Layout title={`Payment Request ${doc.number}`} subtitle="Document overview, actions, and preview.">
      <div className="prd-overview">
        <div className="prd-overview-row">
          <span>Customer</span>
          <strong>{doc.accountName ?? "—"}</strong>
        </div>
        <hr />
        <div className="prd-overview-row">
          <span>Document Amount</span>
          <strong>{doc.currency} {doc.totalAmount}</strong>
        </div>
        <hr />
        <div className="prd-overview-row">
          <span>Document Date</span>
          <strong>{doc.documentDate ?? "—"}</strong>
        </div>
        <hr />
        <StatusPill label={doc.status} tone={doc.status === "OPEN" ? "blue" : doc.status === "CONVERTED" ? "green" : "gray"} />
      </div>

      {doc.status === "OPEN" && !taxStatus && (
        <div className="prd-warning">⚠️ Configure this workspace's billing tax status before converting.</div>
      )}

      {doc.status === "OPEN" && taxStatus && (
        <div className="prd-action-bar">
          <button className="btn btn-primary" onClick={() => convertMutation.mutate(invoiceReceiptTarget)} disabled={convertMutation.isPending}>
            Create Invoice + Receipt
          </button>
          {taxStatus !== "EXEMPT_DEALER" && (
            <button className="btn btn-secondary" onClick={() => convertMutation.mutate("PROFORMA")} disabled={convertMutation.isPending}>
              Create Proforma
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Cancel document
          </button>
        </div>
      )}

      <div className="prd-body">
        <div className="prd-share-panel">
          <button className="prd-share-btn prd-share-btn-email" onClick={() => setEmailModal(true)}>
            <Mail size={16} /> Email
          </button>
          <button className="prd-share-btn prd-share-btn-whatsapp" onClick={() => setWhatsappModal(true)}>
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button className="prd-share-btn prd-share-btn-print" onClick={() => viewPdf("PAYMENT_REQUEST", paymentRequestId)}>
            <Printer size={16} /> Print
          </button>
          <button className="prd-share-btn prd-share-btn-download" onClick={() => downloadPdf("PAYMENT_REQUEST", paymentRequestId)}>
            <Download size={16} /> Download
          </button>
        </div>

        <div className="prd-preview">
          <h3>Document Preview</h3>
          <div className="prd-preview-items">
            {doc.lineItems.map((item) => (
              <div className="prd-preview-item" key={item.id}>
                <span>{item.productOrService}</span>
                <span>{item.quantity} × {item.unitPrice} = {item.lineTotal}</span>
              </div>
            ))}
          </div>
          <div className="prd-signatures">
            <div className="prd-signature">
              <div className="prd-signature-line" />
              <span>Customer signature</span>
            </div>
            <div className="prd-signature">
              <div className="prd-signature-line" />
              <span>Employee signature</span>
            </div>
          </div>
        </div>
      </div>

      {emailModal && (
        <Modal
          title="Send by email"
          onClose={() => setEmailModal(false)}
          width={360}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEmailModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!email.trim() || emailMutation.isPending} onClick={() => emailMutation.mutate()}>
                Send
              </button>
            </>
          }
        >
          <Field label="Email" type="email" value={email} onChange={setEmail} span2 required />
        </Modal>
      )}

      {whatsappModal && (
        <Modal
          title="Share via WhatsApp"
          onClose={() => setWhatsappModal(false)}
          width={360}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setWhatsappModal(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!phone.trim() || whatsappMutation.isPending} onClick={() => whatsappMutation.mutate()}>
                {whatsappMutation.isPending ? "Preparing…" : "Download PDF & open WhatsApp"}
              </button>
            </>
          }
        >
          <label className="field field-span-2">
            <span>Phone number</span>
            <input
              list="prd-saved-phones"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={savedPhoneNumbers.length > 0 ? "Choose a saved number or type one" : "Enter a phone number"}
              required
            />
            <datalist id="prd-saved-phones">
              {savedPhoneNumbers.map((p) => (
                <option key={p.label} value={p.phone}>{p.label}</option>
              ))}
            </datalist>
          </label>
          <p className="prd-whatsapp-hint">
            WhatsApp can't auto-attach a file — this downloads the PDF to your device and opens WhatsApp
            with the message pre-filled. Attach the downloaded file to the chat once it opens.
          </p>
        </Modal>
      )}
    </Layout>
  );
}
