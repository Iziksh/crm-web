import "./Avatar.css";

const COLORS = ["#0073ea", "#a25ddc", "#00c875", "#fdab3d", "#e2445c", "#579bfc"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, background: colorFor(name) }}
      title={name}
    >
      {initials || "?"}
    </span>
  );
}
