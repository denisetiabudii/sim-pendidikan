"use client";
import type { ReactNode } from "react";
import { useToday } from "@/lib/useToday";
import { groupByDay } from "@/lib/groupByDate";

export default function DayGroups<T>({
  items, getIso, render,
}: { items: T[]; getIso: (t: T) => string; render: (t: T) => ReactNode }) {
  const today = useToday();
  const groups = groupByDay(items, getIso, today);
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <section key={g.key}>
          <h4 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-600">
            {g.label}
            <span className="badge">{g.items.length}</span>
            <span className="h-px flex-1 bg-slate-200" aria-hidden />
          </h4>
          <div className="space-y-2">{g.items.map((it) => render(it))}</div>
        </section>
      ))}
    </div>
  );
}