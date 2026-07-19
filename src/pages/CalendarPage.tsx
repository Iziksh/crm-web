import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Layout } from "../components/Layout";
import { Modal } from "../components/Modal";
import { Field, SelectField } from "../components/FormField";
import { StatusPill, type PillTone } from "../components/StatusPill";
import { fetchCalendarActivities, createActivity, type ActivityResponse, type ActivityType, type ActivityStatus, type ActivityPriority } from "../api/activities";
import "./CalendarPage.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  "BUG", "FEATURE", "TASK", "MEETING", "CALL", "EMAIL", "SALES_VISIT", "MAILING", "SMS", "ABSENCE",
].map((t) => ({ value: t as ActivityType, label: t.replace("_", " ") }));

const CHIP_COLOR: Partial<Record<ActivityType, string>> = {
  MEETING: "var(--status-new)",
  TASK: "var(--status-contacted)",
  SALES_VISIT: "var(--status-won)",
  CALL: "var(--status-qualified)",
  EMAIL: "#00838f",
};

const TYPE_TONE: Record<ActivityType, PillTone> = {
  MEETING: "blue",
  CALL: "purple",
  TASK: "orange",
  SALES_VISIT: "green",
  BUG: "red",
  FEATURE: "purple",
  EMAIL: "gray",
  MAILING: "gray",
  SMS: "gray",
  ABSENCE: "gray",
};
const STATUS_TONE: Record<ActivityStatus, PillTone> = { OPEN: "blue", IN_PROGRESS: "orange", RESOLVED: "green", CLOSED: "gray" };
const PRIORITY_TONE: Record<ActivityPriority, PillTone> = { LOW: "gray", MEDIUM: "blue", HIGH: "orange", CRITICAL: "red" };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [newActivityDate, setNewActivityDate] = useState<string | null>(null);
  const [detailActivity, setDetailActivity] = useState<ActivityResponse | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("MEETING");
  const [description, setDescription] = useState("");

  const first = new Date(cursor.year, cursor.month, 1);
  const last = new Date(cursor.year, cursor.month + 1, 0);
  const fromStr = toIso(first);
  const toStr = toIso(last);

  const { data: activities } = useQuery({
    queryKey: ["calendar-activities", fromStr, toStr],
    queryFn: () => fetchCalendarActivities(fromStr, toStr),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createActivity({
        title,
        description,
        type,
        status: "OPEN",
        priority: "MEDIUM" as ActivityPriority,
        dueDate: newActivityDate!,
        assignedToId: null,
        accountId: null,
        contactId: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-activities"] });
      setNewActivityDate(null);
      setTitle("");
      setDescription("");
    },
  });

  const byDate = new Map<string, ActivityResponse[]>();
  activities?.forEach((a) => {
    if (!a.dueDate) return;
    if (!byDate.has(a.dueDate)) byDate.set(a.dueDate, []);
    byDate.get(a.dueDate)!.push(a);
  });

  // Monday-first offset
  const mondayOffset = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const today = toIso(new Date());

  function navigate(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  return (
    <Layout title="Calendar" subtitle="Activities and events across your team.">
      <div className="cal2-nav">
        <button type="button" className="icon-btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
        <span className="cal2-month-label">{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button type="button" className="icon-btn" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
        <div className="cal2-spacer" />
        <button type="button" className="btn btn-primary" onClick={() => setNewActivityDate(today)}>
          <Plus size={16} /> New activity
        </button>
      </div>

      <div className="cal2-grid">
        {WEEKDAYS.map((d) => (
          <div className="cal2-header-cell" key={d}>{d}</div>
        ))}
        {Array.from({ length: mondayOffset }).map((_, i) => (
          <div className="cal2-empty-cell" key={`b${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
          const dayActivities = byDate.get(dateStr) ?? [];
          return (
            <div
              className={"cal2-day-cell" + (dateStr === today ? " cal2-today" : "")}
              key={dateStr}
              onClick={() => setNewActivityDate(dateStr)}
            >
              <div className="cal2-day-number">{day}</div>
              {dayActivities.map((a) => (
                <div
                  className="cal2-chip"
                  key={a.id}
                  style={{ background: CHIP_COLOR[a.type ?? "TASK"] ?? "var(--color-text-faint)" }}
                  onClick={(e) => { e.stopPropagation(); setDetailActivity(a); }}
                  title={a.title}
                >
                  {a.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {newActivityDate && (
        <Modal
          title="New activity"
          onClose={() => setNewActivityDate(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setNewActivityDate(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>
                Create
              </button>
            </>
          }
        >
          <div className="modal-form-grid">
            <Field label="Title" value={title} onChange={setTitle} required span2 />
            <SelectField label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
            <Field label="Date" type="date" value={newActivityDate} onChange={setNewActivityDate} />
            <Field label="Description" value={description} onChange={setDescription} span2 />
          </div>
        </Modal>
      )}

      {detailActivity && (
        <Modal title={detailActivity.title} onClose={() => setDetailActivity(null)} width={380}>
          {detailActivity.description && <p>{detailActivity.description}</p>}
          <p><strong>Type:</strong> {detailActivity.type && <StatusPill label={detailActivity.type.replace("_", " ")} tone={TYPE_TONE[detailActivity.type]} />}</p>
          <p><strong>Status:</strong> <StatusPill label={detailActivity.status.replace("_", " ")} tone={STATUS_TONE[detailActivity.status]} /></p>
          <p><strong>Priority:</strong> {detailActivity.priority && <StatusPill label={detailActivity.priority} tone={PRIORITY_TONE[detailActivity.priority]} />}</p>
          <p><strong>Assigned to:</strong> {detailActivity.assignedToName ?? "—"}</p>
        </Modal>
      )}
    </Layout>
  );
}
