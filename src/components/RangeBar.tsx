"use client";
import { MORE_STEP_DAYS, RANGES } from "@/lib/historyRange";
import type { HistoryRange } from "@/lib/useHistoryRange";

export default function RangeBar({
  h, shown, total, noun = "catatan", note,
}: { h: HistoryRange; shown: number; total: number; noun?: string; note?: string }) {
  const older = Math.max(0, total - shown);
  const since = h.ready
    ? new Date(h.since).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" })
    : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Rentang riwayat" className="flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            aria-pressed={h.range === r.id}
            onClick={() => h.setRange(r.id)}
            className={`rounded-full border px-3 py-1 text-sm ${h.range === r.id ? "border-transparent bg-accent text-white" : "bg-white"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-500">
        {since && `Sejak ${since}: `}
        {shown} {noun}
        {older > 0 ? `, ${older} lebih lama disembunyikan` : ""}.{note ? ` ${note}` : ""}
      </span>
      {older > 0 && (
        <button className="rounded-lg border px-3 py-1 text-sm" onClick={h.more}>
          Muat {MORE_STEP_DAYS} hari lebih lama
        </button>
      )}
    </div>
  );
}
