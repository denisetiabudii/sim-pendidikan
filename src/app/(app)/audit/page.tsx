"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { groupByDay } from "@/lib/groupByDate";
import type { AuditEntry } from "@/lib/types";
import RangeBar from "@/components/RangeBar";
import { useHistoryRange } from "@/lib/useHistoryRange";

const CATS: [string, (a: AuditEntry) => boolean][] = [
  ["Semua", () => true],
  ["Masuk", (a) => a.action === "Masuk"],
  ["Absensi", (a) => /absensi/i.test(a.action)],
  ["Nilai dan rapor", (a) => /nilai|rapor/i.test(a.action)],
  ["Setoran hafalan", (a) => /setoran/i.test(a.action)],
  ["Catatan dan kejadian", (a) => /kejadian|buku penghubung|catatan/i.test(a.action)],
  ["Pengaturan dan data", (a) => /bobot|kelompok|pendidik|penugasan|impor|identitas|kuartal|tahun ajaran|biodata/i.test(a.action)],
];

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

export default function Audit() {
  const { data } = useStore();
  const today = useToday();
  const [cat, setCat] = useState(0);
  const [q, setQ] = useState("");
  const h = useHistoryRange();

  const needle = q.trim().toLowerCase();
  const base = data.audit
    .filter(CATS[cat][1])
    .filter((a) => !needle || [a.actor, a.action, a.object, a.detail].some((s) => s.toLowerCase().includes(needle)));
  const rows = base.filter((a) => h.keep(a.at));
  const shown = rows.slice(0, 300);
  const groups = groupByDay(shown, (a) => a.at, today);

  return (
    <div className="space-y-4">
      <h1>Audit log</h1>

      <div className="card space-y-3 p-3">
        <input
          className="w-full"
          placeholder="Cari pengguna, aksi, nama, atau detail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari audit log"
        />
        <div className="flex flex-wrap gap-2">
          {CATS.map(([name], i) => (
            <button
              key={name}
              onClick={() => setCat(i)}
              aria-pressed={cat === i}
              className={`rounded-full border px-3 py-1 text-sm ${cat === i ? "border-transparent bg-accent text-white" : "bg-white"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <RangeBar h={h} shown={rows.length} total={base.length} noun="catatan" note={rows.length > 300 ? "Hanya 300 terbaru yang ditampilkan." : undefined} />
      </div>

      {groups.map((g) => (
        <section key={g.key} className="card overflow-hidden">
          <h2 className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2 text-sm">
            {g.label}
            <span className="badge">{g.items.length}</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="w-16 p-2">Jam</th>
                  <th className="p-2">Pengguna</th>
                  <th className="p-2">Aksi</th>
                  <th className="p-2">Objek</th>
                  <th className="p-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((a) => (
                  <tr key={a.id} className="border-t align-top">
                    <td className="whitespace-nowrap p-2 text-slate-500">{time(a.at)}</td>
                    <td className="p-2">{a.actor}</td>
                    <td className="p-2 font-medium">{a.action}</td>
                    <td className="p-2">{a.object}</td>
                    <td className="p-2 text-slate-600">{a.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {groups.length === 0 && (
        <p className="card p-4 text-sm text-slate-500">
          {data.audit.length === 0 ? "Belum ada aktivitas tercatat." : "Tidak ada catatan yang cocok dengan filter."}
        </p>
      )}
    </div>
  );
}