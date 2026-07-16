import type { ReactNode } from "react";
import "./AuthCard.css";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-mark">CRM</div>
        <h1>{title}</h1>
        {subtitle && <p className="auth-subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  autoFocus,
  autoComplete,
  maxLength,
  helperText,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  maxLength?: number;
  helperText?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
      />
      {helperText && <span className="field-hint">{helperText}</span>}
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div className="auth-error">{message}</div>;
}

export function AuthSuccess({ message }: { message: string }) {
  return <div className="auth-success">{message}</div>;
}
