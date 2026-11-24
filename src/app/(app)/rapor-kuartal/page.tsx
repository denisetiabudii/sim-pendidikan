"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { ReportAction } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { canEditGroup, myStudentIds } from "@/lib/access";
import { reportTasks } from "@/lib/dashboard";
import { SURAHS, surahOption } from "@/lib/quran";
import {
  AKHLAK_LEGEND, BANDS, DEFAULT_TEXT, MAX_ROWS, PREDIKAT, currentQuarter, fmtNum,
  newRtqReport, reportProblems, rowsFromRecitations, rtqKey, tahfidzAverage, tahfidzPredikat, ziyadah,
} from "@/lib/rtq";
import type { Predikat, Quarter, RtqAspect, RtqReport, RtqSurahRow } from "@/lib/types";
import { StatusBadge, StatusSteps } from "@/components/ReportStatus";
import { Field } from "@/components/FormSection";
import { notify } from "@/lib/toast";
import Modal from "@/components/Modal";
import ActionDialog from "@/components/ActionDialog";
import type { DialogKind } from "@/components/ActionDialog";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";
import PrintPortal from "@/components/PrintPortal";
import RtqLetter from "@/components/RtqLetter";

const ASPECTS = [
  ["akhlak", "tuturKata", "Tutur Kata"],
  ["akhlak", "sikap", "Sikap"],
  ["tahsin", "kelancaran", "Kelancaran"],
  ["tahsin", "makhraj", "Makhroj & Sifatul Huruf"],
  ["tahsin", "tajwid", "Hukum Tajwid"],
] as const;

type Filter = "all" | "belum" | "draft" | "submitted" | "approved" | "published";
const FILTERS: [Filter, string][] = [
  ["all", "Semua"],
  ["belum", "Belum diisi"],
  ["draft", "Draft"],
  ["submitted", "Menunggu persetujuan"],
  ["approved", "Disetujui"],
  ["published", "Terbit"],
];

export default function RaporKuartal() {
  const { data, changeRtqReport } = useStore();
  const user = useUser();
  const today = useToday();
  const [picked, setPicked] = useState<0 | Quarter>(0);
  const firstTask = reportTasks(data, user, myStudentIds(data, user)).find((t) => t.unit === "RTQ")?.quarter;
  const quarter = (picked || firstTask || (today ? currentQuarter(data.academic, today) : 1)) as Quarter;
  const [open, setOpen] = useState<{ id: string; mode: "edit" | "view" } | null>(null);
  const [dlg, setDlg] = useState<{ id: string; kind: DialogKind } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const year = data.academic.year;

  const rep = (id: string) => data.rtqReports[rtqKey(id, year, quarter)];
  const ids = myStudentIds(data, user).filter(
    (id) => data.groups[data.students[id].groupId].unit === "RTQ" && (user.role !== "wali" || rep(id)?.status === "published")
  );
  const statusOf = (id: string): Filter => rep(id)?.status ?? "belum";
  const count = (f: Filter) => (f === "all" ? ids.length : ids.filter((id) => statusOf(id) === f).length);
  const needle = q.trim().toLowerCase();
  const shown = ids.filter(
    (id) => (filter === "all" || statusOf(id) === filter) && (!needle || data.students[id].name.toLowerCase().includes(needle))
  );
  const forceOpen = filter !== "all" || needle !== "";
  const head = user.role === "kepala" && user.unit === "RTQ";

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
    changeRtqReport(id, quarter, action);
  }
  function runDialog(reason?: string) {
    if (!dlg) return;
    setPicked(quarter);
    if (changeRtqReport(dlg.id, quarter, dlg.kind, reason).ok) setDlg(null);
  }

  const cur = open && ids.includes(open.id) ? open : null;
  const curRep = cur ? rep(cur.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Rapor kuartal RTQ</h1>
        <span className="text-sm text-slate-600">Tahun ajaran {year}</span>
        <div className="flex gap-1.5" role="group" aria-label="Kuartal">
          {([1, 2, 3] as Quarter[]).map((k) => {
            const n = ids.filter((id) => data.rtqReports[rtqKey(id, year, k)]).length;
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
        <input className="w-full" placeholder="Cari nama santri…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama santri" />
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
        render={(gid) => (
          <ul className="divide-y">
            {(vis.get(gid) ?? []).map((id) => {
              const s = data.students[id];
              const r = rep(id);
              const avg = r ? tahfidzAverage(r.tahfidz) : null;
              const canTeach = user.role === "pendidik" && canEditGroup(data, user, s.groupId) && (!r || r.status === "draft");
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{s.name}</div>
                    {r ? <StatusSteps status={r.status} /> : <span className="badge badge-warn mt-1">Belum diisi</span>}
                  </div>
                  <div className="text-sm text-slate-600">
                    Rata-rata tahfidz <b className="text-slate-900">{fmtNum(avg)}</b>{" "}
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
          {ids.length === 0
            ? user.role === "wali" ? "Belum ada rapor yang dipublikasikan." : "Tidak ada santri RTQ dalam cakupan Anda."
            : "Tidak ada santri yang cocok dengan filter."}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Alur: draft → diajukan → disetujui PIC unit → dipublikasikan (terkunci). Revisi membuat versi baru dengan alasan.
      </p>

      {cur?.mode === "edit" && <Editor key={`${cur.id}-${quarter}`} studentId={cur.id} quarter={quarter} onClose={() => setOpen(null)} />}
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
            <RtqLetter studentId={cur.id} quarter={quarter} />
          </Modal>
          <PrintPortal><RtqLetter studentId={cur.id} quarter={quarter} /></PrintPortal>
        </>
      )}
      {dlg && <ActionDialog kind={dlg.kind} name={data.students[dlg.id].name} onCancel={() => setDlg(null)} onConfirm={runDialog} />}
    </div>
  );
}

function Section({
  title, done, total, optional, children,
}: { title: string; done?: number; total?: number; optional?: boolean; children: React.ReactNode }) {
  const complete = total !== undefined && done === total;
  return (
    <details open className="card">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 font-semibold">
        <span className="flex-1">{title}</span>
        {optional ? (
          <span className="badge">Opsional</span>
        ) : (
          <span className={`badge ${complete ? "badge-ok" : "badge-warn"}`}>{complete ? "Lengkap" : `${done} dari ${total}`}</span>
        )}
      </summary>
      <div className="space-y-3 border-t p-4">{children}</div>
    </details>
  );
}

function Editor({ studentId, quarter, onClose }: { studentId: string; quarter: Quarter; onClose: () => void }) {
  const { data, saveRtqDraft } = useStore();
  const year = data.academic.year;
  const s = data.students[studentId];
  const existing = data.rtqReports[rtqKey(studentId, year, quarter)] ?? newRtqReport(studentId, year, quarter);
  const [f, setF] = useState({
    akhlak: existing.akhlak, tahsin: existing.tahsin, tahfidz: existing.tahfidz, catatan: existing.catatan,
  });
  const [msg, setMsg] = useState("");
  const [initial] = useState(() => JSON.stringify(f));

  const setAspect = (g: "akhlak" | "tahsin", k: string, patch: Partial<RtqAspect>) =>
    setF({ ...f, [g]: { ...f[g], [k]: { ...(f[g] as Record<string, RtqAspect>)[k], ...patch } } });
  const setRow = (i: number, patch: Partial<RtqSurahRow>) =>
    setF({ ...f, tahfidz: f.tahfidz.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const num = (v: string) => (v === "" ? null : Number(v));
  const predLabel = (g: "akhlak" | "tahsin", p: Predikat) =>
    g === "akhlak" ? `${p} · ${AKHLAK_LEGEND[p]}` : `${p} · ${BANDS.find((b) => b.predikat === p)?.name ?? ""}`;
  const aspectOk = (g: "akhlak" | "tahsin", k: string) => {
    const a = (f[g] as Record<string, RtqAspect>)[k];
    return !!a.predikat && !!a.text.trim();
  };

  function fromRecitations() {
    const q = data.academic.quarters[quarter - 1];
    const rows = rowsFromRecitations(data.recitations, studentId, q.start, q.end);
    if (rows.length === 0) return notify("info", "Tidak ada setoran baru pada kuartal ini.");
    if (f.tahfidz.length > 0 && !confirm("Ganti isi tabel tahfidz dengan data setoran?")) return;
    setF({ ...f, tahfidz: rows });
    setMsg("");
  }

  const akhlakDone = ASPECTS.filter(([g, k]) => g === "akhlak" && aspectOk(g, k)).length;
  const tahsinDone = ASPECTS.filter(([g, k]) => g === "tahsin" && aspectOk(g, k)).length;
  const tahfidzOk = f.tahfidz.length > 0 && f.tahfidz.every((r) => r.harian !== null && r.evaluasi !== null);
  const doneAll = akhlakDone + tahsinDone + (tahfidzOk ? 1 : 0);
  const totalAll = 6;
  const ready = reportProblems({ ...existing, ...f } as RtqReport).length === 0;
  const avg = tahfidzAverage(f.tahfidz);
  const band = tahfidzPredikat(avg);

  const renderAspects = (g: "akhlak" | "tahsin") =>
    ASPECTS.filter(([gg]) => gg === g).map(([, k, label]) => {
      const a = (f[g] as Record<string, RtqAspect>)[k];
      return (
        <div key={k} className="rounded-lg border bg-slate-50/60 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={label}>
              <select
                className="w-full"
                value={a.predikat}
                onChange={(e) => {
                  const p = e.target.value as Predikat | "";
                  setAspect(g, k, { predikat: p, ...(p === "A" && !a.text ? { text: DEFAULT_TEXT[k] } : {}) });
                }}
              >
                <option value="">Pilih predikat</option>
                {PREDIKAT.map((p) => (
                  <option key={p} value={p}>{predLabel(g, p)}</option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Keterangan singkat sesuai pengamatan selama kuartal">
                <textarea className="w-full" rows={2} maxLength={500} value={a.text} onChange={(e) => setAspect(g, k, { text: e.target.value })} />
              </Field>
            </div>
          </div>
        </div>
      );
    });

  return (
    <Modal
      size="xl"
      title={`Rapor RTQ: ${s.name}`}
      subtitle={`Kuartal ${quarter} · Tahun ajaran ${year}`}
      onClose={onClose}
      dirty={JSON.stringify(f) !== initial}
      saveLabel="Simpan draft"
      onSave={() => {
        if (saveRtqDraft(studentId, quarter, f).ok) onClose();
      }}
      footerNote={<span>{msg || (ready ? "Semua isian wajib lengkap." : "Lengkapi bagian bertanda kuning.")}</span>}
    >
    <div className="space-y-3">
      <div className="card space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1" />
          <span className={`badge ${ready ? "badge-ok" : "badge-warn"}`}>{ready ? "Siap diajukan" : "Belum lengkap"}</span>
        </div>
        <StatusSteps status={existing.status} />
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-600">
            <span>Kelengkapan isian wajib</span>
            <b>{doneAll} dari {totalAll}</b>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${(doneAll / totalAll) * 100}%` }} />
          </div>
        </div>
      </div>

      <Section title="Akhlak" done={akhlakDone} total={2}>{renderAspects("akhlak")}</Section>
      <Section title="Tahsin" done={tahsinDone} total={3}>{renderAspects("tahsin")}</Section>

      <Section title="Tahfidz" done={tahfidzOk ? 1 : 0} total={1}>
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={fromRecitations}>Ambil dari setoran</button>
          <button
            className="rounded-lg border px-3 py-1.5 text-sm"
            disabled={f.tahfidz.length >= MAX_ROWS}
            onClick={() =>
              setF({ ...f, tahfidz: [...f.tahfidz, { surahNo: 0, name: "", from: 1, to: 1, harian: null, evaluasi: null }] })
            }
          >
            Tambah surah
          </button>
          <span className="text-xs text-slate-500">{f.tahfidz.length} dari {MAX_ROWS} baris</span>
        </div>

        {f.tahfidz.map((r, i) => (
          <div key={i} className="rounded-lg border bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between text-sm font-medium">
              <span>Surah ke-{i + 1}</span>
              <button className="rounded px-2 text-red-700 hover:bg-red-50" aria-label={`Hapus surah ke-${i + 1}`}
                onClick={() => setF({ ...f, tahfidz: f.tahfidz.filter((_, j) => j !== i) })}>Hapus</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="sm:col-span-2">
                <Field label="Surah">
                  <select
                    dir="ltr"
                    className="w-full"
                    value={r.surahNo}
                    onChange={(e) => {
                      const no = Number(e.target.value);
                      setRow(i, { surahNo: no, name: no ? SURAHS[no - 1][0] : "" });
                    }}
                  >
                    <option value={0}>Tulis manual…</option>
                    {SURAHS.map(([name], j) => (
                      <option key={name} value={j + 1}>{surahOption(j + 1)}</option>
                    ))}
                  </select>
                </Field>
                {r.surahNo === 0 && (
                  <input className="mt-2 w-full" dir="auto" placeholder="Nama surah (manual)" aria-label="Nama surah manual"
                    value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
                )}
              </div>
              <Field label="Ayat awal">
                <input type="number" min={1} className="w-full" value={r.from || ""} onChange={(e) => setRow(i, { from: Number(e.target.value) })} />
              </Field>
              <Field label="Ayat akhir">
                <input type="number" min={1} className="w-full" value={r.to || ""} onChange={(e) => setRow(i, { to: Number(e.target.value) })} />
              </Field>
              <Field label="Nilai harian">
                <input type="number" min={0} max={100} className="w-full" value={r.harian ?? ""} onChange={(e) => setRow(i, { harian: num(e.target.value) })} />
              </Field>
              <Field label="Nilai evaluasi">
                <input type="number" min={0} max={100} className="w-full" value={r.evaluasi ?? ""} onChange={(e) => setRow(i, { evaluasi: num(e.target.value) })} />
              </Field>
            </div>
          </div>
        ))}
        {f.tahfidz.length === 0 && <p className="text-sm text-slate-500">Belum ada surah. Ambil dari setoran atau tambahkan manual.</p>}

        <p className="rounded-lg bg-accent-soft p-3 text-sm text-accent-ink">
          Rata-rata: <b>{fmtNum(avg)}</b>{" "}
          {band ? `(${band.predikat} · ${band.name})` : avg !== null ? "(di bawah rentang predikat)" : ""} · Jumlah ziyadah:{" "}
          <b>{ziyadah(f.tahfidz)} ayat</b>
        </p>
      </Section>

      <Section title="Catatan pembimbing" optional>
        <Field label="Pesan, motivasi, atau saran singkat">
          <textarea className="w-full" rows={3} maxLength={1000} value={f.catatan} onChange={(e) => setF({ ...f, catatan: e.target.value })} />
        </Field>
      </Section>
    </div>
    </Modal>
  );
}
