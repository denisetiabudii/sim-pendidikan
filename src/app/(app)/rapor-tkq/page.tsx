"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { ReportAction } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { canEditGroup, myStudentIds } from "@/lib/access";
import { reportTasks } from "@/lib/dashboard";
import { currentQuarter, rtqKey } from "@/lib/rtq";
import { paiTotals } from "@/lib/tkq";
import type { Quarter } from "@/lib/types";
import { StatusBadge, StatusSteps } from "@/components/ReportStatus";
import { BioEditor, TkqEditor } from "@/components/TkqEditor";
import TkqLetter from "@/components/TkqLetter";
import Modal from "@/components/Modal";
import ActionDialog from "@/components/ActionDialog";
import type { DialogKind } from "@/components/ActionDialog";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";
import PrintPortal from "@/components/PrintPortal";

type Filter = "all" | "belum" | "draft" | "submitted" | "approved" | "published";
const FILTERS: [Filter, string][] = [
  ["all", "Semua"], ["belum", "Belum diisi"], ["draft", "Draft"],
  ["submitted", "Menunggu persetujuan"], ["approved", "Disetujui"], ["published", "Terbit"],
];

export default function RaporTkq() {
  const { data, changeTkqReport } = useStore();
  const user = useUser();
  const today = useToday();
  const [picked, setPicked] = useState<0 | Quarter>(0);
  const firstTask = reportTasks(data, user, myStudentIds(data, user)).find((t) => t.unit === "TKQ")?.quarter;
  const quarter = (picked || firstTask || (today ? currentQuarter(data.academic, today) : 1)) as Quarter;
  const [open, setOpen] = useState<{ id: string; mode: "edit" | "view" | "bio" } | null>(null);
  const [dlg, setDlg] = useState<{ id: string; kind: DialogKind } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const year = data.academic.year;

  const rep = (id: string) => data.tkqReports[rtqKey(id, year, quarter)];
  const ids = myStudentIds(data, user).filter((id) => data.groups[data.students[id].groupId].unit === "TKQ");
  const statusOf = (id: string): Filter => rep(id)?.status ?? "belum";
  const count = (f: Filter) => (f === "all" ? ids.length : ids.filter((id) => statusOf(id) === f).length);
  const needle = q.trim().toLowerCase();
  const shown = ids.filter(
    (id) => (filter === "all" || statusOf(id) === filter) && (!needle || data.students[id].name.toLowerCase().includes(needle))
  );
  const forceOpen = filter !== "all" || needle !== "";
  const head = user.role === "kepala" && user.unit === "TKQ";

  const byGroup = (list: string[]) => {
    const m = new Map<string, string[]>();
    for (const id of list) m.set(data.students[id].groupId, [...(m.get(data.students[id].groupId) ?? []), id]);
    return m;
  };
  const all = byGroup(ids);
  const vis = byGroup(shown);
  const order = [...(forceOpen ? vis : all).keys()].sort((a, b) => data.groups[a].name.localeCompare(data.groups[b].name));
  const accGroups: AccGroup[] = order.map((gid) => {
    const list = all.get(gid) ?? [];
    const n = (f: Filter) => list.filter((id) => statusOf(id) === f).length;
    return {
      id: gid,
      title: data.groups[gid].name,
      total: list.length,
      chips: [
        { label: "belum diisi", n: n("belum"), cls: "badge-warn" },
        { label: "draft", n: n("draft") },
        { label: "menunggu persetujuan", n: n("submitted"), cls: "badge-warn" },
        { label: "disetujui", n: n("approved"), cls: "badge-accent" },
        { label: "terbit", n: n("published"), cls: "badge-ok" },
      ],
    };
  });

  function act(id: string, action: ReportAction) {
    setPicked(quarter);
    changeTkqReport(id, quarter, action);
  }
  function runDialog(reason?: string) {
    if (!dlg) return;
    setPicked(quarter);
    if (changeTkqReport(dlg.id, quarter, dlg.kind, reason).ok) setDlg(null);
  }

  const cur = open && ids.includes(open.id) ? open : null;
  const curRep = cur ? rep(cur.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Penilaian & Raport TKQ</h1>
        <span className="text-sm text-slate-600">Tahun ajaran {year}</span>
        <div className="flex gap-1.5" role="group" aria-label="Kuartal">
          {([1, 2, 3] as Quarter[]).map((k) => {
            const n = ids.filter((id) => data.tkqReports[rtqKey(id, year, k)]).length;
            return (
              <button
                key={k}
                aria-pressed={quarter === k}
                onClick={() => { setPicked(k); setOpen(null); }}
                className={`rounded-lg border px-3 py-1.5 text-sm ${quarter === k ? "bg-accent text-white" : "bg-white"}`}
              >
                Kuartal {k} <span className="opacity-70">({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card space-y-3 p-3">
        <input className="w-full" placeholder="Cari nama siswa…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama siswa" />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([f, label]) => (
            <button
              key={f}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "bg-accent text-white" : "bg-white"}`}
            >
              {label} <span className="opacity-70">{count(f)}</span>
            </button>
          ))}
        </div>
      </div>

      <GroupAccordion
        groups={accGroups}
        forceOpen={forceOpen}
        noun="santri"
        render={(gid) => (
          <ul className="divide-y">
            {(vis.get(gid) ?? []).map((id) => {
              const s = data.students[id];
              const r = rep(id);
              const t = r ? paiTotals(data.paiTemplate, r.pai) : null;
              const canEdit = canEditGroup(data, user, s.groupId) && (user.role === "pendidik" || user.role === "kepala");
              const canTeach = user.role === "pendidik" && canEdit && (!r || r.status === "draft");
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{s.name}</div>
                    {r ? <StatusSteps status={r.status} /> : <span className="badge badge-warn mt-1">Belum diisi</span>}
                  </div>
                  <div className="text-sm text-slate-600">
                    Indikator PAI <b className="text-slate-900">{t ? `${t.done}/${t.total}` : "–"}</b>{" "}
                    {r && <StatusBadge status={r.status} version={r.version} />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canTeach && <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setOpen({ id, mode: "edit" })}>Isi rapor</button>}
                    {canTeach && r && <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => setDlg({ id, kind: "submit" })}>Ajukan</button>}
                    {head && r?.status === "submitted" && (
                      <>
                        <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => act(id, "approve")}>Setujui</button>
                        <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => act(id, "return")}>Kembalikan</button>
                      </>
                    )}
                    {head && r?.status === "approved" && <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => setDlg({ id, kind: "publish" })}>Publikasikan</button>}
                    {head && r?.status === "published" && <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setDlg({ id, kind: "revise" })}>Buat revisi</button>}
                    {canEdit && <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setOpen({ id, mode: "bio" })}>Biodata</button>}
                    {r && <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setOpen({ id, mode: "view" })}>Lihat</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      />

      {accGroups.length === 0 && (
        <p className="card p-4 text-sm text-slate-500">
          {ids.length === 0 ? "Tidak ada siswa TKQ dalam cakupan Anda." : "Tidak ada siswa yang cocok dengan filter."}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Alur: draft → diajukan → disetujui PIC unit → dipublikasikan (terkunci). Revisi membuat versi baru dengan alasan.
      </p>

      {cur?.mode === "edit" && <TkqEditor key={`${cur.id}-${quarter}`} studentId={cur.id} quarter={quarter} onClose={() => setOpen(null)} />}
      {cur?.mode === "bio" && <BioEditor key={cur.id} studentId={cur.id} onClose={() => setOpen(null)} />}
      {cur?.mode === "view" && curRep && (
        <>
          <Modal
            size="xl"
            title={`Rapor ${data.students[cur.id].name}`}
            subtitle={`Kuartal ${quarter} · Tahun ajaran ${year}`}
            cancelLabel="Tutup"
            onClose={() => setOpen(null)}
            footerNote={curRep.status !== "published" ? <span className="text-amber-800">Belum dipublikasikan. Isi masih bisa berubah.</span> : undefined}
            extra={<button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => window.print()}>Cetak / simpan PDF</button>}
          >
            <TkqLetter studentId={cur.id} quarter={quarter} />
          </Modal>
          <PrintPortal><TkqLetter studentId={cur.id} quarter={quarter} /></PrintPortal>
        </>
      )}
      {dlg && <ActionDialog kind={dlg.kind} name={data.students[dlg.id].name} onCancel={() => setDlg(null)} onConfirm={runDialog} />}
    </div>
  );
}