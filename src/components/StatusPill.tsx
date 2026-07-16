import "./StatusPill.css";

export type PillTone = "blue" | "orange" | "purple" | "green" | "red" | "gray";

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span className="status-pill" data-tone={tone}>
      {label}
    </span>
  );
}
