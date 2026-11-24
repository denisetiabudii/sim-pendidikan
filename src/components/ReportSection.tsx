import type { ReactNode } from "react";

export function ProgressBadge({ done, total }: { done: number; total: number }) {
  const ok = done === total;
  return <span className={`badge ${ok ? "badge-ok" : "badge-warn"}`}>{ok ? "Lengkap" : `${done} dari ${total}`}</span>;
}

export default function ReportSection({
  title, badge, children, defaultOpen = true,
}: { title: string; badge?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="card">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold">
        <span className="flex-1">{title}</span>
        {badge}
      </summary>
      <div className="space-y-3 border-t p-4">{children}</div>
    </details>
  );
}