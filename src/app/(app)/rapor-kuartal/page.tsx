"use client";
import { Fragment, useState } from "react";
import { useStore } from "@/lib/store";
import type { ReportAction } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { canEditGroup, myStudentIds } from "@/lib/access";
import { reportTasks } from "@/lib/dashboard";
import { SURAHS, surahOption } from "@/lib/quran";
import {
  AKHLAK_LEGEND, BANDS, DEFAULT_TEXT, MAX_ROWS, PREDIKAT, absenceCounts, currentQuarter, fmtNum,
  newRtqReport, reportProblems, rowName, rowsFromRecitations, rtqKey, tahfidzAverage, tahfidzPredikat, ziyadah,
} from "@/lib/rtq";
import type { Institution, Predikat, Quarter, RtqAspect, RtqReport, RtqSurahRow } from "@/lib/types";
import { StatusBadge, StatusSteps } from "@/components/ReportStatus";
import { Field } from "@/components/FormSection";
import { notify } from "@/lib/toast";

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
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const year = data.academic.year;

  const rep = (id: string) => data.rtqReports[rtqKey(id, year, quarter)];
  const ids = myStudentIds(data, user).filter(
    (id) =>
      data.groups[data.students[id].groupId].unit === "RTQ" &&
      (user.role !== "wali" || rep(id)?.status === "published")
  );
  const statusOf = (id: string): Filter => rep(id)?.status ?? "belum";
  const count = (f: Filter) => (f === "all" ? ids.length : ids.filter((id) => statusOf(id) === f).length);

  const needle = q.trim().toLowerCase();
  const shown = ids.filter(
    (id) =>
      (filter === "all" || statusOf(id) === filter) &&
      (!needle || data.students[id].name.toLowerCase().includes(needle))
  );
  const byGroup = new Map<string, string[]>();
  for (const id of shown) {
    const g = data.students[id].groupId;
    byGroup.set(g, [...(byGroup.get(g) ?? []), id]);
  }
  const groups = [...byGroup.entries()].sort((a, b) => data.groups[a[0]].name.localeCompare(data.groups[b[0]].name));
  const head = user.role === "kepala" && user.unit === "RTQ";

  function act(id: string, action: ReportAction) {
    setPicked(quarter);
    let reason: string | undefined;
    if (action === "publish" && !confirm("Publikasikan rapor ke orang tua? Rapor akan terkunci.")) return;
    if (action === "revise") reason = prompt("Alasan revisi rapor:") ?? "";
    const r = changeRtqReport(id, quarter, action, reason);
    setMsg(r.ok ? "" : r.error);
  }

  const openItem = open && ids.includes(open.id) ? open : null;

  return (
    <div className="space-y-4">
      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex-1">Rapor kuartal RTQ</h1>
          <span className="text-sm text-slate-600">Tahun ajaran {year}</span>
          <select
            className="text-sm"
            value={quarter}
            aria-label="Kuartal"
            onChange={(e) => {
              setPicked(Number(e.target.value) as Quarter);
              setOpen(null);
            }}
          >
            {[1, 2, 3].map((k) => (
              <option key={k} value={k}>Kuartal {k}</option>
            ))}
          </select>
        </div>

        <div className="card space-y-3 p-3">
          <input
            className="w-full"
            placeholder="Cari nama santri…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari nama santri"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([f, label]) => (
              <button
                key={f}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1 text-sm ${filter === f ? "border-transparent bg-accent text-white" : "bg-white"}`}
              >
                {label} <span className="opacity-70">{count(f)}</span>
              </button>
            ))}
          </div>
        </div>

        {msg && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{msg}</p>}

        {groups.map(([gid, list]) => (
          <section key={gid} className="card overflow-hidden">
            <h2 className="flex items-center gap-2 border-b bg-slate-50 px-4 py-2.5 text-sm">
              {data.groups[gid].name}
              <span className="badge">{list.length} santri</span>
            </h2>
            <ul className="divide-y">
              {list.map((id) => {
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
                      Rata-rata tahfidz <b className="text-slate-900">{fmtNum(avg)}</b>
                      {r && <StatusBadge status={r.status} version={r.version} />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canTeach && (
                        <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setOpen({ id, mode: "edit" })}>
                          Isi rapor
                        </button>
                      )}
                      {canTeach && r && (
                        <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => act(id, "submit")}>
                          Ajukan
                        </button>
                      )}
                      {head && r?.status === "submitted" && (
                        <>
                          <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => act(id, "approve")}>Setujui</button>
                          <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => act(id, "return")}>Kembalikan</button>
                        </>
                      )}
                      {head && r?.status === "approved" && (
                        <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => act(id, "publish")}>Publikasikan</button>
                      )}
                      {head && r?.status === "published" && (
                        <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => act(id, "revise")}>Buat revisi</button>
                      )}
                      {r && (
                        <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setOpen({ id, mode: "view" })}>Lihat</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {groups.length === 0 && (
          <p className="card p-4 text-sm text-slate-500">
            {ids.length === 0
              ? user.role === "wali" ? "Belum ada rapor yang dipublikasikan." : "Tidak ada santri RTQ dalam cakupan Anda."
              : "Tidak ada santri yang cocok dengan filter."}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Alur: draft → diajukan → disetujui PIC unit → dipublikasikan (terkunci). Revisi membuat versi baru dengan alasan.
        </p>
      </div>

      {openItem?.mode === "edit" && <Editor key={`${openItem.id}-${quarter}`} studentId={openItem.id} quarter={quarter} />}
      {openItem?.mode === "view" && <Letter studentId={openItem.id} quarter={quarter} />}
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

function Editor({ studentId, quarter }: { studentId: string; quarter: Quarter }) {
  const { data, saveRtqDraft } = useStore();
  const year = data.academic.year;
  const s = data.students[studentId];
  const existing = data.rtqReports[rtqKey(studentId, year, quarter)] ?? newRtqReport(studentId, year, quarter);
  const [f, setF] = useState({
    akhlak: existing.akhlak, tahsin: existing.tahsin, tahfidz: existing.tahfidz, catatan: existing.catatan,
  });
  const [msg, setMsg] = useState("");

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
    <section className="space-y-3 print:hidden">
      <div className="card space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1">Isi rapor: {s.name} · Kuartal {quarter}</h2>
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

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white"
          onClick={() => {
            const r = saveRtqDraft(studentId, quarter, f);
            setMsg(r.ok ? "Draft tersimpan. Klik Ajukan di daftar bila sudah lengkap." : r.error);
          }}
        >
          Simpan draft
        </button>
        <p className="flex-1 text-sm" role="status">{msg || (ready ? "Semua isian wajib lengkap." : "Lengkapi bagian bertanda kuning.")}</p>
      </div>
    </section>
  );
}

const blue = "bg-[#4472c4] text-white font-bold text-center p-1";
const cell = "border border-slate-400 p-1.5 align-top";

function LetterHead({ ins }: { ins: Institution }) {
  return (
    <div className="mb-3 border-b-4 border-double border-black pb-2">
      <div className="flex items-center gap-3">
        {ins.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ins.logoDataUrl}
            alt="Logo lembaga"
            className="h-16 w-16 object-contain"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center border border-dashed text-[10px] text-slate-400 print:border-slate-300">
            Logo
          </div>
        )}
        <div className="flex-1 text-center font-serif">
          <div className="text-2xl font-bold uppercase">{ins.name}</div>
          <div className="text-[11px]">{ins.address}</div>
          <div className="text-[11px]">
            Nomor Statistik LPQ. {ins.nomorStatistik}
          </div>
        </div>
      </div>
    </div>
  );
}

function AspectTable({
  title,
  items,
}: {
  title: string;
  items: [string, RtqAspect][];
}) {
  return (
    <table className="mb-3 w-full border-collapse text-sm">
      <thead>
        <tr>
          <th colSpan={3} className={blue}>
            {title}
          </th>
        </tr>
        <tr>
          <th className={cell}>Aspek Penilaian</th>
          <th className={cell}>Keterangan</th>
          <th className={`${cell} w-16`}>Predikat</th>
        </tr>
      </thead>
      <tbody>
        {items.map(([label, a]) => (
          <tr key={label}>
            <td className={cell}>{label}</td>
            <td className={cell}>{a.text}</td>
            <td className={`${cell} text-center`}>{a.predikat}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Letter({
  studentId,
  quarter,
}: {
  studentId: string;
  quarter: Quarter;
}) {
  const { data } = useStore();
  const { institution: ins, academic } = data;
  const s = data.students[studentId];
  const g = data.groups[s.groupId];
  const r = data.rtqReports[rtqKey(studentId, academic.year, quarter)];
  if (!r) return null;

  const q = academic.quarters[quarter - 1];
  const abs = r.absence ?? absenceCounts(data, studentId, q.start, q.end);
  const avg = tahfidzAverage(r.tahfidz);
  const band = tahfidzPredikat(avg);
  const teacher = Object.values(data.users).find(
    (u) => u.role === "pendidik" && u.groupIds?.includes(s.groupId),
  );
  const signDate = new Date(`${q.signDate}T00:00:00Z`).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  );

  return (
    <section className="mx-auto mt-4 max-w-3xl bg-white p-6 font-serif text-sm shadow print:mt-0 print:max-w-none print:p-0 print:shadow-none">
      <div className="mb-3 flex items-center gap-2 print:hidden">
        <button
          className="rounded bg-teal-700 px-3 py-1.5 text-sm text-white"
          onClick={() => window.print()}
        >
          Cetak / simpan PDF
        </button>
        {r.status !== "published" && (
          <span className="text-xs text-amber-800">
            Belum dipublikasikan. Isi masih bisa berubah.
          </span>
        )}
      </div>

      <LetterHead ins={ins} />
      <h2 className="mb-3 text-center text-lg font-bold">
        DAFTAR NILAI EVALUASI KUARTAL {quarter}
        <br />
        TAHUN AJARAN {academic.year}
      </h2>
      <p>Nama Lengkap Santri : {s.name}</p>
      <p className="mb-3">Nama Halaqah : {g.name}</p>

      <AspectTable
        title="NILAI AKHLAK"
        items={[
          ["Tutur Kata", r.akhlak.tuturKata],
          ["Sikap", r.akhlak.sikap],
        ]}
      />
      <AspectTable
        title="NILAI TAHSIN"
        items={[
          ["Kelancaran", r.tahsin.kelancaran],
          ["Makhroj & Sifatul Huruf", r.tahsin.makhraj],
          ["Hukum Tajwid", r.tahsin.tajwid],
        ]}
      />

      <table className="mb-3 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th colSpan={4} className={blue}>
              KETERANGAN PREDIKAT NILAI AKHLAK
            </th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((i) => (
            <tr key={i}>
              {[PREDIKAT[i], PREDIKAT[i + 4]].map((p) => (
                <Fragment key={p}>
                  <td className={`${cell} w-10`}>{p}</td>
                  <td className={cell}>{AKHLAK_LEGEND[p]}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="break-before-page" />
      <LetterHead ins={ins} />
      <table className="mb-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th colSpan={5} className={blue}>
              NILAI TAHFIDZ
            </th>
          </tr>
          <tr>
            <th className={`${cell} w-10`}>No</th>
            <th className={cell}>Nama Surat</th>
            <th className={cell}>Ayat</th>
            <th className={cell}>Nilai Harian</th>
            <th className={cell}>Nilai Evaluasi</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: MAX_ROWS }, (_, i) => r.tahfidz[i]).map(
            (row, i) => (
              <tr key={i} className="h-7">
                <td className={`${cell} text-center`}>{i + 1}</td>
                <td
                  className={`${cell} text-center text-lg`}
                  dir="rtl"
                  lang="ar"
                >
                  {row ? rowName(row) : ""}
                </td>
                <td className={`${cell} text-center`}>
                  {row ? `${row.from} - ${row.to}` : ""}
                </td>
                <td className={`${cell} text-center`}>{row?.harian ?? ""}</td>
                <td className={`${cell} text-center`}>{row?.evaluasi ?? ""}</td>
              </tr>
            ),
          )}
          <tr className="bg-[#ed7d31] font-bold text-white">
            <td colSpan={2} className={`${cell} text-center`}>
              RATA-RATA NILAI
            </td>
            <td className={`${cell} text-center`}>{band?.predikat ?? "–"}</td>
            <td className={`${cell} text-center`}>{fmtNum(avg)}</td>
            <td className={`${cell} text-center uppercase`}>
              {band?.name ?? ""}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mb-3 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={blue} colSpan={2}>
              Ketidakhadiran
            </th>
            <th className={blue}>Jumlah Ziyadah</th>
            <th className={blue}>Catatan</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cell}>Sakit</td>
            <td className={cell}>{abs.sakit} hari</td>
            <td rowSpan={3} className={`${cell} text-center align-middle`}>
              {ziyadah(r.tahfidz)} Ayat
            </td>
            <td rowSpan={3} className={`${cell} text-center align-middle`}>
              {r.catatan}
            </td>
          </tr>
          <tr>
            <td className={cell}>Izin</td>
            <td className={cell}>{abs.izin} hari</td>
          </tr>
          <tr>
            <td className={cell}>Tanpa Keterangan</td>
            <td className={cell}>{abs.tanpa} hari</td>
          </tr>
        </tbody>
      </table>

      <table className="mb-4 w-full border-collapse text-xs">
        <thead>
          <tr>
            <th colSpan={6} className={blue}>
              KETERANGAN PREDIKAT NILAI TAHSIN & TAHFIDZ
            </th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3].map((i) => (
            <tr key={i}>
              {[BANDS[i], BANDS[i + 4]].map((b) => (
                <Fragment key={b.predikat}>
                  <td className={`${cell} w-8`}>{b.predikat}</td>
                  <td className={cell}>{b.name}</td>
                  <td className={cell}>
                    {b.min}-{b.max}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between pt-2 text-sm font-bold">
        <div>
          Mudir {ins.name}
          <div className="h-16" />
          <u>{ins.mudir}</u>
        </div>
        <div className="text-right">
          {ins.city}, {signDate}
          <br />
          Pembimbing
          <div className="h-12" />
          <u>{teacher?.name ?? "………………"}</u>
        </div>
      </div>
    </section>
  );
}
