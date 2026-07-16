import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import "./Layout.css";

const RTL_PREVIEW_KEY = "crm.rtlPreview";

export function Layout({
  title,
  subtitle,
  children,
  rtlToggle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Shows a manual LTR/RTL preview toggle — CSS in this module uses logical properties, so
   * flipping `dir` here is a real (layout-only, not translated) RTL preview, not just cosmetic. */
  rtlToggle?: boolean;
}) {
  const [dir, setDir] = useState<"ltr" | "rtl">(
    () => (localStorage.getItem(RTL_PREVIEW_KEY) as "ltr" | "rtl") ?? "ltr",
  );

  function toggleDir() {
    const next = dir === "ltr" ? "rtl" : "ltr";
    setDir(next);
    localStorage.setItem(RTL_PREVIEW_KEY, next);
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <header className="app-header">
          <div className="app-header-row">
            <div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
            {rtlToggle && (
              <button type="button" className="btn btn-secondary btn-small" onClick={toggleDir}>
                {dir === "ltr" ? "Preview RTL" : "Preview LTR"}
              </button>
            )}
          </div>
        </header>
        <main className="app-content" dir={rtlToggle ? dir : undefined}>{children}</main>
      </div>
    </div>
  );
}
