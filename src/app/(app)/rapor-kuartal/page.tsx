"use client";
import { Fragment, useState } from "react";
import { useStore } from "@/lib/store";
import type { ReportAction } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { canEditGroup, myStudentIds } from "@/lib/access";
import { STATUS_LABEL } from "@/lib/reports";
import { SURAHS, surahOption } from "@/lib/quran";
import {
  AKHLAK_LEGEND,
  BANDS,
  DEFAULT_TEXT,
  MAX_ROWS,
  PREDIKAT,
  absenceCounts,
  currentQuarter,
  fmtNum,
  newRtqReport,
  rowName,
  rowsFromRecitations,
  rtqKey,
  tahfidzAverage,
  tahfidzPredikat,
  ziyadah,
} from "@/lib/rtq";
import type {
  Institution,
  Predikat,
  Quarter,
  RtqAspect,
  RtqSurahRow,
} from "@/lib/types";
import { useUser } from "@/lib/useUser";

const ASPECTS = [
  ["akhlak", "tuturKata", "Tutur Kata"],
  ["akhlak", "sikap", "Sikap"],
  ["tahsin", "kelancaran", "Kelancaran"],
  ["tahsin", "makhraj", "Makhroj & Sifatul Huruf"],
  ["tahsin", "tajwid", "Hukum Tajwid"],
] as const;

export default function RaporKuartal() {
  const { data, changeRtqReport } = useStore();
  const user = useUser();
  const today = useToday();
  const [picked, setPicked] = useState<0 | Quarter>(0);
  const quarter = (picked ||
    (today ? currentQuarter(data.academic, today) : 1)) as Quarter;
  const [open, setOpen] = useState<{
    id: string;
    mode: "edit" | "view";
  } | null>(null);
  const [msg, setMsg] = useState("");
  const year = data.academic.year;

  const rep = (id: string) => data.rtqReports[rtqKey(id, year, quarter)];
  const ids = myStudentIds(data, user).filter(
    (id) =>
      data.groups[data.students[id].groupId].unit === "RTQ" &&
      (user.role !== "wali" || rep(id)?.status === "published"),
  );

  function act(id: string, action: ReportAction) {
    let reason: string | undefined;
    if (
      action === "publish" &&
      !confirm("Publikasikan rapor ke orang tua? Rapor akan terkunci.")
    )
      return;
    if (action === "revise") reason = prompt("Alasan revisi rapor:") ?? "";
    const r = changeRtqReport(id, quarter, action, reason);
    setMsg(r.ok ? "" : r.error);
  }

  const openId = open && ids.includes(open.id) ? open : null;

  return (
    <div>
      <div className="print:hidden">
        <h1 className="mb-3 text-xl font-bold">Rapor kuartal RTQ</h1>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Tahun ajaran {year}</span>
          <select
            className="rounded border bg-white p-2"
            value={quarter}
            onChange={(e) => {
              setPicked(Number(e.target.value) as Quarter);
              setOpen(null);
            }}
            aria-label="Kuartal"
          >
            {[1, 2, 3].map((q) => (
              <option key={q} value={q}>
                Kuartal {q}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="p-2">Santri</th>
                <th className="p-2">Rata-rata tahfidz</th>
                <th className="p-2">Status</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => {
                const s = data.students[id];
                const r = rep(id);
                const avg = r ? tahfidzAverage(r.tahfidz) : null;
                const canTeach =
                  user.role === "pendidik" &&
                  canEditGroup(data, user, s.groupId) &&
                  (!r || r.status === "draft");
                const head = user.role === "kepala" && user.unit === "RTQ";
                return (
                  <tr key={id} className="border-t">
                    <td className="p-2">
                      {s.name}{" "}
                      <span className="text-xs text-slate-500">
                        {data.groups[s.groupId].name}
                      </span>
                    </td>
                    <td className="p-2">{fmtNum(avg)}</td>
                    <td className="p-2">
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {r
                          ? `${STATUS_LABEL[r.status]} v${r.version}`
                          : "Belum diisi"}
                      </span>
                    </td>
                    <td className="space-x-1 p-2">
                      {canTeach && (
                        <button
                          className="rounded border px-2.5 py-1"
                          onClick={() => setOpen({ id, mode: "edit" })}
                        >
                          Isi rapor
                        </button>
                      )}
                      {canTeach && r && (
                        <button
                          className="rounded bg-teal-700 px-2.5 py-1 text-white"
                          onClick={() => act(id, "submit")}
                        >
                          Ajukan
                        </button>
                      )}
                      {head && r?.status === "submitted" && (
                        <>
                          <button
                            className="rounded bg-teal-700 px-2.5 py-1 text-white"
                            onClick={() => act(id, "approve")}
                          >
                            Setujui
                          </button>
                          <button
                            className="rounded border px-2.5 py-1"
                            onClick={() => act(id, "return")}
                          >
                            Kembalikan
                          </button>
                        </>
                      )}
                      {head && r?.status === "approved" && (
                        <button
                          className="rounded bg-teal-700 px-2.5 py-1 text-white"
                          onClick={() => act(id, "publish")}
                        >
                          Publikasikan
                        </button>
                      )}
                      {head && r?.status === "published" && (
                        <button
                          className="rounded border px-2.5 py-1"
                          onClick={() => act(id, "revise")}
                        >
                          Buat revisi
                        </button>
                      )}
                      {r && (
                        <button
                          className="rounded border px-2.5 py-1"
                          onClick={() => setOpen({ id, mode: "view" })}
                        >
                          Lihat
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {ids.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 text-slate-500">
                    {user.role === "wali"
                      ? "Belum ada rapor yang dipublikasikan."
                      : "Tidak ada santri RTQ dalam cakupan Anda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
        <p className="mt-2 text-sm text-slate-500">
          Alur: draft → diajukan → disetujui kepala unit → dipublikasikan
          (terkunci). Revisi membuat versi baru.
        </p>
      </div>

      {openId?.mode === "edit" && (
        <Editor
          key={`${openId.id}-${quarter}`}
          studentId={openId.id}
          quarter={quarter}
        />
      )}
      {openId?.mode === "view" && (
        <Letter studentId={openId.id} quarter={quarter} />
      )}
    </div>
  );
}

function Editor({
  studentId,
  quarter,
}: {
  studentId: string;
  quarter: Quarter;
}) {
  const { data, saveRtqDraft } = useStore();
  const year = data.academic.year;
  const s = data.students[studentId];
  const existing =
    data.rtqReports[rtqKey(studentId, year, quarter)] ??
    newRtqReport(studentId, year, quarter);
  const [f, setF] = useState({
    akhlak: existing.akhlak,
    tahsin: existing.tahsin,
    tahfidz: existing.tahfidz,
    catatan: existing.catatan,
  });
  const [msg, setMsg] = useState("");

  const setAspect = (
    g: "akhlak" | "tahsin",
    k: string,
    patch: Partial<RtqAspect>,
  ) =>
    setF({
      ...f,
      [g]: {
        ...f[g],
        [k]: { ...(f[g] as Record<string, RtqAspect>)[k], ...patch },
      },
    });
  const setRow = (i: number, patch: Partial<RtqSurahRow>) =>
    setF({
      ...f,
      tahfidz: f.tahfidz.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    });
  const num = (v: string) => (v === "" ? null : Number(v));

  function fromRecitations() {
    const q = data.academic.quarters[quarter - 1];
    const rows = rowsFromRecitations(
      data.recitations,
      studentId,
      q.start,
      q.end,
    );
    if (rows.length === 0)
      return setMsg("Tidak ada setoran baru pada kuartal ini.");
    if (
      f.tahfidz.length > 0 &&
      !confirm("Ganti isi tabel tahfidz dengan data setoran?")
    )
      return;
    setF({ ...f, tahfidz: rows });
    setMsg("");
  }

  const avg = tahfidzAverage(f.tahfidz);
  const band = tahfidzPredikat(avg);

  return (
    <section className="mt-4 space-y-4 rounded border bg-white p-4 print:hidden">
      <h2 className="text-lg font-bold">
        Isi rapor: {s.name} · Kuartal {quarter}
      </h2>

      {ASPECTS.map(([g, k, label]) => {
        const a = (f[g] as Record<string, RtqAspect>)[k];
        return (
          <div key={k} className="rounded border p-2">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
              <b className="w-44">
                {g === "akhlak" ? "Akhlak" : "Tahsin"} · {label}
              </b>
              <select
                className="rounded border bg-white p-1.5"
                value={a.predikat}
                aria-label={`Predikat ${label}`}
                onChange={(e) => {
                  const p = e.target.value as Predikat | "";
                  setAspect(g, k, {
                    predikat: p,
                    ...(p === "A" && !a.text ? { text: DEFAULT_TEXT[k] } : {}),
                  });
                }}
              >
                <option value="">Predikat</option>
                {PREDIKAT.map((p) => (
                  <option key={p} value={p}>
                    {p} · {AKHLAK_LEGEND[p]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="w-full rounded border p-2 text-sm"
              rows={2}
              maxLength={500}
              placeholder="Keterangan singkat sesuai pengamatan selama kuartal"
              value={a.text}
              onChange={(e) => setAspect(g, k, { text: e.target.value })}
            />
          </div>
        );
      })}

      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">Nilai tahfidz</h3>
          <button
            className="rounded border px-2.5 py-1 text-sm"
            onClick={fromRecitations}
          >
            Ambil dari setoran
          </button>
          <button
            className="rounded border px-2.5 py-1 text-sm disabled:opacity-40"
            disabled={f.tahfidz.length >= MAX_ROWS}
            onClick={() =>
              setF({
                ...f,
                tahfidz: [
                  ...f.tahfidz,
                  {
                    surahNo: 0,
                    name: "",
                    from: 1,
                    to: 1,
                    harian: null,
                    evaluasi: null,
                  },
                ],
              })
            }
          >
            Tambah baris
          </button>
        </div>
        <div className="space-y-2">
          {f.tahfidz.map((r, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm"
            >
              <span className="w-5">{i + 1}</span>
              <select
                className="rounded border bg-white p-1.5"
                value={r.surahNo}
                aria-label="Surah"
                onChange={(e) => {
                  const no = Number(e.target.value);
                  setRow(i, { surahNo: no, name: no ? SURAHS[no - 1][0] : "" });
                }}
              >
                <option value={0}>Tulis manual</option>
                {SURAHS.map(([name], j) => (
                  <option key={name} value={j + 1}>
                    {surahOption(j + 1)}
                  </option>
                ))}
              </select>
              {r.surahNo === 0 && (
                <input
                  className="w-32 rounded border p-1.5"
                  dir="rtl"
                  placeholder="Nama surah"
                  value={r.name}
                  onChange={(e) => setRow(i, { name: e.target.value })}
                />
              )}
              <input
                type="number"
                min={1}
                className="w-20 rounded border p-1.5"
                aria-label="Ayat awal"
                value={r.from || ""}
                onChange={(e) => setRow(i, { from: Number(e.target.value) })}
              />
              <span>–</span>
              <input
                type="number"
                min={1}
                className="w-20 rounded border p-1.5"
                aria-label="Ayat akhir"
                value={r.to || ""}
                onChange={(e) => setRow(i, { to: Number(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                max={100}
                className="w-24 rounded border p-1.5"
                placeholder="Harian"
                aria-label="Nilai harian"
                value={r.harian ?? ""}
                onChange={(e) => setRow(i, { harian: num(e.target.value) })}
              />
              <input
                type="number"
                min={0}
                max={100}
                className="w-24 rounded border p-1.5"
                placeholder="Evaluasi"
                aria-label="Nilai evaluasi"
                value={r.evaluasi ?? ""}
                onChange={(e) => setRow(i, { evaluasi: num(e.target.value) })}
              />
              <button
                className="text-red-700"
                aria-label="Hapus baris"
                onClick={() =>
                  setF({ ...f, tahfidz: f.tahfidz.filter((_, j) => j !== i) })
                }
              >
                ✕
              </button>
            </div>
          ))}
          {f.tahfidz.length === 0 && (
            <p className="text-sm text-slate-500">
              Belum ada baris. Tambahkan atau ambil dari setoran.
            </p>
          )}
        </div>
        <p className="mt-2 text-sm">
          Rata-rata: <b>{fmtNum(avg)}</b>{" "}
          {band
            ? `(${band.predikat} · ${band.name})`
            : avg !== null
              ? "(di bawah rentang predikat)"
              : ""}{" "}
          · Jumlah ziyadah: <b>{ziyadah(f.tahfidz)} ayat</b>
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold">
          Catatan pembimbing
        </label>
        <textarea
          className="w-full rounded border p-2 text-sm"
          rows={2}
          maxLength={1000}
          value={f.catatan}
          onChange={(e) => setF({ ...f, catatan: e.target.value })}
        />
      </div>

      <button
        className="rounded bg-teal-700 px-4 py-2 text-sm text-white"
        onClick={() => {
          const r = saveRtqDraft(studentId, quarter, f);
          setMsg(
            r.ok
              ? "Draft tersimpan. Klik Ajukan di daftar bila sudah lengkap."
              : r.error,
          );
        }}
      >
        Simpan draft
      </button>
      {msg && <p className="text-sm">{msg}</p>}
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
