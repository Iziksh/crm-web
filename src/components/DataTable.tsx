import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import "./DataTable.css";

export interface Column<T> {
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyFn,
  onEdit,
  onDelete,
  onRowClick,
  isSelected,
}: {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string | number;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onRowClick?: (row: T) => void;
  isSelected?: (row: T) => boolean;
}) {
  const hasActions = !!(onEdit || onDelete);

  return (
    <div className="data-table-wrap">
      <div
        className="data-table-row data-table-head"
        style={{ gridTemplateColumns: gridTemplate(columns, hasActions) }}
      >
        {columns.map((c) => (
          <span key={c.header}>{c.header}</span>
        ))}
        {hasActions && <span>Actions</span>}
      </div>

      {rows.map((row) => (
        <div
          className={"data-table-row" + (onRowClick ? " data-table-row-clickable" : "") + (isSelected?.(row) ? " data-table-row-selected" : "")}
          key={keyFn(row)}
          style={{ gridTemplateColumns: gridTemplate(columns, hasActions) }}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {columns.map((c) => (
            <span key={c.header}>{c.render(row)}</span>
          ))}
          {hasActions && (
            <span className="data-table-actions" onClick={(e) => e.stopPropagation()}>
              {onEdit && (
                <button type="button" className="icon-btn" onClick={() => onEdit(row)} aria-label="Edit">
                  <Pencil size={15} />
                </button>
              )}
              {onDelete && (
                <button type="button" className="icon-btn icon-btn-danger" onClick={() => onDelete(row)} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function gridTemplate<T>(columns: Column<T>[], hasActions: boolean) {
  const widths = columns.map((c) => c.width ?? "1fr");
  if (hasActions) widths.push("90px");
  return widths.join(" ");
}
