"use client";
import { useState } from "react";

export interface GroupEntry {
  id: string;
  name: string;
  sub: string;
  total: number;
  flag: number; // jumlah yang perlu perhatian (belum dibaca, kejadian baru)
  latest: string; // ISO terbaru, untuk pengurutan
}

export default function StudentGroups({
  entries,
  flagLabel,
  empty,
  render,
}: {
  entries: GroupEntry[];
  flagLabel: string;
  empty: string;
  render: (studentId: string) => React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null); // "" = sengaja ditutup

  const shown = entries
    .filter((e) => e.total > 0 && e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.flag > 0) - Number(a.flag > 0) || b.latest.localeCompare(a.latest));

  return (
    <div>
      <input
        className="mb-3 w-full rounded border bg-white p-2 text-sm"
        placeholder="Cari nama…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Cari nama"
      />
      {shown.map((e) => {
        const isOpen = open === e.id || (open === null && shown.length === 1);
        return (
          <section key={e.id} className="mb-2 rounded border bg-white">
            <button
              className="flex w-full flex-wrap items-center gap-2 p-3 text-left"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? "" : e.id)}
            >
              <b>{e.name}</b>
              <span className="text-xs text-slate-500">{e.sub}</span>
              <span className="ml-auto rounded-full border px-2 py-0.5 text-xs">{e.total} catatan</span>
              {e.flag > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  {e.flag} {flagLabel}
                </span>
              )}
              <span aria-hidden>{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && <div className="space-y-3 border-t p-3">{render(e.id)}</div>}
          </section>
        );
      })}
      {shown.length === 0 && (
        <p className="rounded border bg-white p-3 text-sm text-slate-500">{q ? "Tidak ada nama yang cocok." : empty}</p>
      )}
    </div>
  );
}