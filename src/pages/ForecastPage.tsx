import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../components/Layout";
import { DataTable, type Column } from "../components/DataTable";
import { StatusPill } from "../components/StatusPill";
import { LEAD_STATUS_META, OPPORTUNITY_STAGE_META, QUOTE_STATUS_META, type StatusMeta } from "../lib/statusMeta";
import { fetchLeadForecast, fetchOpportunityForecast, fetchQuoteForecast, type ForecastByStageResponse, type ForecastSummaryResponse } from "../api/forecast";
import "./ForecastPage.css";

type Tab = "leads" | "opportunities" | "quotes";

const TABS: { key: Tab; label: string }[] = [
  { key: "leads", label: "Leads" },
  { key: "opportunities", label: "Opportunities" },
  { key: "quotes", label: "Quotes" },
];

function formatAmount(v: number | null) {
  return v == null ? "—" : v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function ForecastTable({ summary, showWeighted, stageMeta }: { summary: ForecastSummaryResponse; showWeighted: boolean; stageMeta: Record<string, StatusMeta> }) {
  const columns: Column<ForecastByStageResponse>[] = [
    {
      header: "Stage / Status",
      render: (r) => {
        const meta = stageMeta[r.stage];
        return meta ? <StatusPill label={meta.label} tone={meta.tone} /> : r.stage;
      },
      width: "2fr",
    },
    { header: "Count", render: (r) => r.count },
    { header: "Amount", render: (r) => formatAmount(r.amount) },
    ...(showWeighted ? [{ header: "Weighted", render: (r: ForecastByStageResponse) => formatAmount(r.weighted) } as Column<ForecastByStageResponse>] : []),
  ];

  return (
    <>
      <div className="forecast-summary-row">
        <div className="forecast-card">
          <div className="forecast-card-value">{summary.period}</div>
          <div className="forecast-card-label">Period</div>
        </div>
        <div className="forecast-card">
          <div className="forecast-card-value">{formatAmount(summary.totalAmount)}</div>
          <div className="forecast-card-label">Total</div>
        </div>
        <div className="forecast-card">
          <div className="forecast-card-value">{summary.count}</div>
          <div className="forecast-card-label">Records</div>
        </div>
        {showWeighted && summary.weightedAmount != null && (
          <div className="forecast-card">
            <div className="forecast-card-value">{formatAmount(summary.weightedAmount)}</div>
            <div className="forecast-card-label">Weighted</div>
          </div>
        )}
      </div>
      <DataTable columns={columns} rows={summary.byStage} keyFn={(r) => r.stage} />
    </>
  );
}

export function ForecastPage() {
  const [tab, setTab] = useState<Tab>("leads");

  const { data: leadForecast } = useQuery({ queryKey: ["forecast", "leads"], queryFn: fetchLeadForecast });
  const { data: opportunityForecast } = useQuery({ queryKey: ["forecast", "opportunities"], queryFn: fetchOpportunityForecast });
  const { data: quoteForecast } = useQuery({ queryKey: ["forecast", "quotes"], queryFn: fetchQuoteForecast });

  return (
    <Layout title="Forecast" subtitle="Pipeline projections across leads, opportunities, and quotes.">
      <div className="forecast-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={"forecast-tab" + (tab === t.key ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "leads" && leadForecast && <ForecastTable summary={leadForecast} showWeighted={false} stageMeta={LEAD_STATUS_META} />}
      {tab === "opportunities" && opportunityForecast && <ForecastTable summary={opportunityForecast} showWeighted stageMeta={OPPORTUNITY_STAGE_META} />}
      {tab === "quotes" && quoteForecast && <ForecastTable summary={quoteForecast} showWeighted={false} stageMeta={QUOTE_STATUS_META} />}
    </Layout>
  );
}
