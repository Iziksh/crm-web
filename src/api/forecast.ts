import { apiFetch } from "./client";

export interface ForecastByStageResponse {
  stage: string;
  count: number;
  amount: number | null;
  weighted: number | null;
}

export interface ForecastSummaryResponse {
  period: string;
  totalAmount: number | null;
  weightedAmount: number | null;
  count: number;
  byStage: ForecastByStageResponse[];
}

export function fetchLeadForecast() {
  return apiFetch<ForecastSummaryResponse>("/forecast/leads");
}

export function fetchOpportunityForecast() {
  return apiFetch<ForecastSummaryResponse>("/forecast/opportunities");
}

export function fetchQuoteForecast() {
  return apiFetch<ForecastSummaryResponse>("/forecast/quotes");
}
