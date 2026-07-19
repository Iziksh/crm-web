import type { PillTone } from "../components/StatusPill";

export interface StatusMeta {
  label: string;
  tone: PillTone;
}

export const LEAD_STATUS_META: Record<string, StatusMeta> = {
  NEW: { label: "New", tone: "blue" },
  CONTACTED: { label: "Contacted", tone: "orange" },
  QUALIFIED: { label: "Qualified", tone: "purple" },
  WON: { label: "Won", tone: "green" },
  LOST: { label: "Lost", tone: "red" },
};

export const OPPORTUNITY_STAGE_META: Record<string, StatusMeta> = {
  PROSPECTING: { label: "Prospecting", tone: "blue" },
  QUALIFICATION: { label: "Qualification", tone: "orange" },
  PROPOSAL: { label: "Proposal", tone: "purple" },
  NEGOTIATION: { label: "Negotiation", tone: "orange" },
  WON: { label: "Won", tone: "green" },
  LOST: { label: "Lost", tone: "red" },
};

export const CONTACT_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: "Active", tone: "green" },
  INACTIVE: { label: "Inactive", tone: "gray" },
  LEAD: { label: "Lead", tone: "blue" },
  PROSPECT: { label: "Prospect", tone: "purple" },
};

export const ACCOUNT_TYPE_META: Record<string, StatusMeta> = {
  PROSPECT: { label: "Prospect", tone: "purple" },
  CUSTOMER: { label: "Customer", tone: "green" },
  PARTNER: { label: "Partner", tone: "blue" },
  VENDOR: { label: "Vendor", tone: "orange" },
};

export const QUOTE_STATUS_META: Record<string, StatusMeta> = {
  DRAFT: { label: "Draft", tone: "gray" },
  SENT: { label: "Sent", tone: "blue" },
  WON: { label: "Won", tone: "green" },
  LOST: { label: "Lost", tone: "red" },
  EXPIRED: { label: "Expired", tone: "orange" },
};

export const ADDON_META: Record<string, StatusMeta> = {
  "Time Clock": { label: "Time Clock", tone: "blue" },
  "Billing & Documents": { label: "Billing & Documents", tone: "purple" },
};

/** Tones used for addons outside the catalog. Gray is reserved for "no addons". */
const ADDON_FALLBACK_TONES: PillTone[] = ["green", "orange", "red", "purple", "blue"];

/**
 * Addon names are free text, so anything outside ADDON_META gets a tone derived
 * from the name — the same addon then keeps the same color across every row.
 */
export function addonMeta(name: string): StatusMeta {
  const known = ADDON_META[name];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return { label: name, tone: ADDON_FALLBACK_TONES[(hash >>> 0) % ADDON_FALLBACK_TONES.length] };
}

export const ATTENDANCE_REPORT_TYPE_META: Record<string, StatusMeta> = {
  PRESENCE: { label: "Presence", tone: "gray" },
  VACATION: { label: "Vacation", tone: "blue" },
  SICK: { label: "Sick", tone: "red" },
  RESERVE_DUTY: { label: "Reserve duty", tone: "purple" },
  HOLIDAY: { label: "Holiday", tone: "green" },
  ABSENCE: { label: "Absence", tone: "orange" },
};
