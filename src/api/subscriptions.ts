import { apiFetch } from "./client";

export type SubscriptionEventType = "OBJECT_CREATION" | "OBJECT_REPLACEMENT" | "OBJECT_REMOVAL";

export interface SubscriptionResponse {
  id: number;
  name: string;
  description: string | null;
  active: boolean;
  topicId: number;
  topicName: string;
  entityType: string;
  eventTypes: SubscriptionEventType[];
  filterName0: string | null; filterValue0: string | null;
  filterName1: string | null; filterValue1: string | null;
  filterName2: string | null; filterValue2: string | null;
  filterName3: string | null; filterValue3: string | null;
  filterName4: string | null; filterValue4: string | null;
}

export interface SubscriptionRequest {
  name: string;
  description: string;
  active: boolean;
  topicId: number;
  eventTypes: SubscriptionEventType[];
  filterName0: string; filterValue0: string;
  filterName1: string; filterValue1: string;
  filterName2: string; filterValue2: string;
  filterName3: string; filterValue3: string;
  filterName4: string; filterValue4: string;
}

export function fetchSubscriptions() {
  return apiFetch<SubscriptionResponse[]>("/subscriptions");
}

export function createSubscription(req: SubscriptionRequest) {
  return apiFetch<SubscriptionResponse>("/subscriptions", { method: "POST", body: JSON.stringify(req) });
}

export function updateSubscription(id: number, req: SubscriptionRequest) {
  return apiFetch<SubscriptionResponse>(`/subscriptions/${id}`, { method: "PUT", body: JSON.stringify(req) });
}

export function deleteSubscription(id: number) {
  return apiFetch<void>(`/subscriptions/${id}`, { method: "DELETE" });
}

export interface TopicResponse {
  id: number;
  topicKey: string | null;
  name: string;
  entityType: string;
}

export function fetchTopics() {
  return apiFetch<TopicResponse[]>("/topics");
}
