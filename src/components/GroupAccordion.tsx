"use client";
import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface AccGroup {
  id: string;
  title: string;
  total: number;
  chips: { label: string; n: number; cls?: string }[];
}

export default function GroupAccordion({
  groups, forceOpen, render, noun = "siswa",
}: { groups: AccGroup[]; forceOpen: boolean; render: (id: string) => ReactNode; noun?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => forceOpen || (open[id] ?? groups.length === 1);
  const setAll = (v: boolean) => setOpen(Object.fromEntries(groups.map((g) => [g.id, v])));

  return (
    <div className="space-y-3">
      {groups.length > 1 && !forceOpen && (
        <div className="flex justify-end gap-2 text-sm">
          <button className="rounded-lg border px-3 py-1" onClick={() => setAll(true)}>Buka semua</button>
          <button className="rounded-lg border px-3 py-1" onClick={() => setAll(false)}>Tutup semua</button>
        </div>
      )}
      {groups.map((g) => {
        const o = isOpen(g.id);
        return (
          <section key={g.id} className="card overflow-hidden">
            <button
              type="button"
              aria-expanded={o}
              aria-controls={`grp-${g.id}`}
              onClick={() => !forceOpen && setOpen({ ...open, [g.id]: !o })}
              className={`flex w-full flex-wrap items-center gap-2 bg-slate-50 px-4 py-3 text-left ${forceOpen ? "cursor-default" : ""}`}
            >
              <ChevronDown size={18} aria-hidden className={`shrink-0 transition-transform ${o ? "" : "-rotate-90"}`} />
              <span className="font-semibold">{g.title}</span>
              <span className="badge">{g.total} {noun}</span>
              <span className="ml-auto flex flex-wrap gap-1.5">
                {g.chips.filter((c) => c.n > 0).map((c) => (
                  <span key={c.label} className={`badge ${c.cls ?? ""}`}>{c.n} {c.label}</span>
                ))}
              </span>
            </button>
            {o && <div id={`grp-${g.id}`}>{render(g.id)}</div>}
          </section>
        );
      })}
    </div>
  );
}