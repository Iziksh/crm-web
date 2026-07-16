export function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
  span2,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  span2?: boolean;
}) {
  return (
    <label className={"field" + (span2 ? " field-span-2" : "")}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  span2,
}: {
  label: string;
  value: T | "";
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  span2?: boolean;
}) {
  return (
    <label className={"field" + (span2 ? " field-span-2" : "")}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        <option value="" disabled>
          Select…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
