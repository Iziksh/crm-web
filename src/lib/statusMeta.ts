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
