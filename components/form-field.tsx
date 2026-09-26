type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
};

export function FormField({ label, htmlFor, error, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="form-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
      {error ? <p className="form-error mt-1" role="alert">{error}</p> : null}
    </div>
  );
}
