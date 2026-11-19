import type { ReactNode } from "react";

export function FormGroup({
  step, title, hint, children,
}: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border bg-slate-50/60 p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white" aria-hidden>
          {step}
        </span>
        {title}
      </legend>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}