import { STATUS_LABEL } from "@/lib/reports";
import type { ReportStatus } from "@/lib/types";

const COLOR: Record<ReportStatus, string> = {
  draft: "",
  submitted: "badge-warn",
  approved: "badge-accent",
  published: "badge-ok",
};

export function StatusBadge({ status, version }: { status: ReportStatus; version?: number }) {
  return (
    <span className={`badge ${COLOR[status]}`}>
      {STATUS_LABEL[status]}
      {version ? ` v${version}` : ""}
    </span>
  );
}

const STEPS: ReportStatus[] = ["draft", "submitted", "approved", "published"];

export function StatusSteps({ status }: { status: ReportStatus }) {
  const idx = STEPS.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-1 text-[11px]" aria-label="Tahap rapor">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span
            aria-current={i === idx ? "step" : undefined}
            className={`rounded-full px-2 py-0.5 ${
              i < idx
                ? "bg-accent-soft text-accent-ink"
                : i === idx
                  ? "bg-accent font-semibold text-white"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {STATUS_LABEL[s]}
          </span>
          {i < STEPS.length - 1 && <span className="text-slate-300" aria-hidden>›</span>}
        </li>
      ))}
    </ol>
  );
}