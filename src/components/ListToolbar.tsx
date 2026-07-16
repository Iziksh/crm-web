import { useRef } from "react";
import { Search, Plus, Upload, Download } from "lucide-react";
import "./ListToolbar.css";

export function ListToolbar({
  search,
  onSearchChange,
  placeholder,
  addLabel,
  onAdd,
  onImport,
  importing,
  onExport,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  addLabel: string;
  onAdd: () => void;
  onImport?: (file: File) => void;
  importing?: boolean;
  onExport?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="list-toolbar">
      {onSearchChange ? (
        <div className="list-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
          />
        </div>
      ) : (
        <span />
      )}
      <div className="list-toolbar-actions">
        {onExport && (
          <button type="button" className="btn btn-secondary" onClick={onExport}>
            <Download size={16} />
            Export CSV
          </button>
        )}
        {onImport && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              {importing ? "Importing…" : "Import CSV"}
            </button>
          </>
        )}
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          <Plus size={16} />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
