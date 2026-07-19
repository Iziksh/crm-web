import { useQuery } from "@tanstack/react-query";
import { fetchLeads, type LeadResponse, type LeadStatus } from "../api/leads";
import { Layout } from "../components/Layout";
import { Board, type BoardGroup } from "../components/Board";
import type { Column } from "../components/DataTable";
import { Avatar } from "../components/Avatar";
import { LEAD_STATUS_META } from "../lib/statusMeta";
import { useAccountScope } from "../context/AccountScopeContext";
import "./LeadsPage.css";

const GROUP_ORDER: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

function formatMoney(value: number | null, currency: string | null) {
  if (value == null) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: currency ?? "USD", maximumFractionDigits: 0 });
}

function groupLeads(leads: LeadResponse[]): BoardGroup<LeadResponse>[] {
  const buckets = new Map<LeadStatus, LeadResponse[]>();
  for (const status of GROUP_ORDER) buckets.set(status, []);
  for (const lead of leads) buckets.get(lead.status)?.push(lead);
  return GROUP_ORDER.map((status) => ({
    key: status,
    label: LEAD_STATUS_META[status].label,
    tone: LEAD_STATUS_META[status].tone,
    rows: buckets.get(status) ?? [],
  }));
}

const columns: Column<LeadResponse>[] = [
  {
    header: "Lead",
    render: (lead) => (
      <span className="lead-title">
        {lead.title}
        {lead.email && <span className="lead-sub">{lead.email}</span>}
      </span>
    ),
  },
  { header: "Company", render: (lead) => lead.company ?? "—" },
  {
    header: "Assigned to",
    render: (lead) =>
      lead.assignedToName ? (
        <span className="lead-assignee">
          <Avatar name={lead.assignedToName} size={24} />
          {lead.assignedToName}
        </span>
      ) : (
        "—"
      ),
  },
  { header: "Value", render: (lead) => formatMoney(lead.estimatedValue, lead.currency) },
  { header: "Close date", render: (lead) => lead.closeDate ?? "—" },
];

export function LeadsPage() {
  const { accountId: scopedAccountId } = useAccountScope();
  const { data: leads, isLoading, isError } = useQuery({
    queryKey: ["leads", scopedAccountId],
    queryFn: () => fetchLeads(scopedAccountId),
  });

  return (
    <Layout title="Leads" subtitle="Track and qualify incoming leads through your pipeline.">
      {isLoading && <p className="leads-status">Loading leads…</p>}
      {isError && <p className="leads-status leads-error">Couldn't load leads — is the backend running on :9080?</p>}
      {leads && leads.length === 0 && <p className="leads-status">No leads yet.</p>}

      {leads && leads.length > 0 && <Board groups={groupLeads(leads)} columns={columns} keyFn={(l) => l.id} />}
    </Layout>
  );
}
