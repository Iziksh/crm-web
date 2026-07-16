import { StatusPill, type PillTone } from "./StatusPill";
import type { Column } from "./DataTable";
import "./Board.css";

export interface BoardGroup<T> {
  key: string;
  label: string;
  tone: PillTone;
  rows: T[];
}

export function Board<T>({
  groups,
  columns,
  keyFn,
}: {
  groups: BoardGroup<T>[];
  columns: Column<T>[];
  keyFn: (row: T) => string | number;
}) {
  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");

  return (
    <>
      {groups
        .filter((g) => g.rows.length > 0)
        .map((g) => (
          <section className="board-group" key={g.key}>
            <div className="board-group-header" data-tone={g.tone}>
              <StatusPill label={g.label} tone={g.tone} />
              <span className="board-group-count">{g.rows.length}</span>
            </div>

            <div className="board-table">
              <div className="board-row board-row-head" style={{ gridTemplateColumns }}>
                {columns.map((c) => (
                  <span key={c.header}>{c.header}</span>
                ))}
              </div>

              {g.rows.map((row) => (
                <div className="board-row" key={keyFn(row)} style={{ gridTemplateColumns }}>
                  {columns.map((c) => (
                    <span key={c.header}>{c.render(row)}</span>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
    </>
  );
}
