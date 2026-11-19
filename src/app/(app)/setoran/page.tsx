"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { myGroupIds, myStudentIds } from "@/lib/access";
import { RECITATION_KINDS, RECITATION_QUALITIES } from "@/lib/constants";
import { juzText, totalMemorized } from "@/lib/hafalan";
import {
  SURAHS, isolateAr, matchSurah, surahArabic, surahLabel, surahOption, surahsInJuz, validateAyatRange,
} from "@/lib/quran";
import type { JuzPart } from "@/lib/quran";
import type { RecitationKind, RecitationQuality } from "@/lib/types";
import StudentGroups from "@/components/StudentGroups";
import type { GroupEntry } from "@/components/StudentGroups";
import DayGroups from "@/components/DayGroups";
import { Field, FormGroup } from "@/components/FormSection";
import { warn } from "@/lib/toast";

const QUALITY_BADGE: Record<RecitationQuality, string> = {
  Lancar: "badge-ok",
  Cukup: "badge-warn",
  "Perlu diulang": "badge-bad",
};

export default function Setoran() {
  const { data, addRecitation } = useStore();
  const user = useUser();
  const today = useToday();

  const rtqStudents = myStudentIds(data, user)
    .map((id) => data.students[id])
    .filter((s) => data.groups[s.groupId].unit === "RTQ");
  const hasRtq = myGroupIds(data, user).some((g) => data.groups[g].unit === "RTQ") || user.role === "wali";
  const canRecord = user.role === "pendidik" && rtqStudents.length > 0;

  const [sid, setSid] = useState("");
  const [pickedDate, setPickedDate] = useState("");
  const [kind, setKind] = useState<RecitationKind>("Setoran baru");
  const [juz, setJuz] = useState(30); // 0 = semua juz
  const [surahNo, setSurahNo] = useState(0); // 0 = surah pertama di daftar, -1 = tulis manual
  const [manualName, setManualName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quality, setQuality] = useState<RecitationQuality>("Lancar");
  const [msg, setMsg] = useState("");

  const studentId = rtqStudents.some((s) => s.id === sid) ? sid : rtqStudents[0]?.id;
  const date = pickedDate || today;
  const options: JuzPart[] = juz
    ? surahsInJuz(juz)
    : SURAHS.map(([name, ayat], i) => ({ no: i + 1, name, from: 1, to: ayat }));
  const manual = surahNo === -1;
  const cur = options.find((o) => o.no === surahNo) ?? options[0];
  const matched = manual ? matchSurah(manualName) : 0;

  const entries: GroupEntry[] = rtqStudents.map((s) => {
    const mine = data.recitations.filter((r) => r.studentId === s.id);
    return {
      id: s.id,
      name: s.name,
      sub: data.groups[s.groupId].name,
      total: mine.length,
      flag: 0,
      latest: mine.reduce((a, r) => (r.createdAt > a ? r.createdAt : a), ""),
    };
  });

  function save() {
    if (!studentId || !date) return;
    if (!from || !to) return warn("Isi ayat awal dan ayat akhir.");
    const f = Number(from);
    const t = Number(to);

    if (!manual) {
      const rangeError = validateAyatRange(cur.no, f, t);
      if (rangeError) return warn(rangeError);
      if (juz && (f < cur.from || t > cur.to))
        return warn(
          `Di Juz ${juz}, ${isolateAr(surahLabel(cur.no))} hanya ayat ${cur.from}–${cur.to}. ` +
            `Pilih "Semua juz" bila rentangnya melewati batas juz.`
        );
    }

    const input = {
      studentId,
      date,
      kind,
      surahNo: manual ? 0 : cur.no,
      surahName: manual ? manualName : undefined,
      from: f,
      to: t,
      quality,
    };
    let r = addRecitation(input);
    if (!r.ok && r.code === "overlap" && confirm(`${r.error}\n\nTetap catat sebagai setoran baru?`))
      r = addRecitation({ ...input, confirmOverlap: true });
    setMsg(r.ok ? "Setoran tercatat." : r.error);
    if (r.ok) {
      setFrom("");
      setTo("");
      if (manual) setManualName("");
    }
  }

  if (!hasRtq)
    return (
      <div className="space-y-3">
        <h1>Setoran hafalan</h1>
        <p className="card p-3 text-sm text-slate-600">
          Setoran hafalan hanya untuk peserta RTQ. Tidak ada peserta RTQ dalam cakupan Anda.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1>Setoran hafalan</h1>

      {canRecord && (
        <section className="card space-y-3 p-4">
          <h2>Catat setoran</h2>

          <FormGroup step={1} title="Siapa dan kapan">
            <Field label="Santri">
              <select className="w-full" value={studentId ?? ""} onChange={(e) => setSid(e.target.value)}>
                {rtqStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal">
              <input type="date" className="w-full" value={date} onChange={(e) => setPickedDate(e.target.value)} />
            </Field>
            <Field label="Jenis">
              <select className="w-full" value={kind} onChange={(e) => setKind(e.target.value as RecitationKind)}>
                {RECITATION_KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </Field>
          </FormGroup>

          <FormGroup
            step={2}
            title="Hafalan"
            hint='Pilih juz untuk mempersempit daftar surah, atau "Semua juz" bila rentangnya melewati batas juz.'
          >
            <Field label="Juz">
              <select
                className="w-full"
                value={juz}
                onChange={(e) => {
                  setJuz(Number(e.target.value));
                  if (!manual) setSurahNo(0);
                  setFrom("");
                  setTo("");
                }}
              >
                <option value={0}>Semua juz</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                  <option key={j} value={j}>Juz {j}</option>
                ))}
              </select>
            </Field>
            <Field label="Surah">
              <select
                dir="ltr"
                className="w-full"
                value={manual ? -1 : cur.no}
                onChange={(e) => {
                  setSurahNo(Number(e.target.value));
                  setFrom("");
                  setTo("");
                }}
              >
                {options.map((o) => (
                  <option key={o.no} value={o.no}>
                    {surahOption(o.no, juz ? `ayat ${o.from}–${o.to}` : `${o.to} ayat`)}
                  </option>
                ))}
                <option value={-1}>Tulis manual…</option>
              </select>
            </Field>
            {manual && (
              <Field label="Nama surah (manual)">
                <input
                  dir="auto"
                  className="w-full"
                  maxLength={50}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </Field>
            )}
            <Field label={manual ? "Ayat awal" : `Ayat awal (${cur.from}–${cur.to})`}>
              <input
                type="number"
                className="w-full"
                min={manual ? 1 : cur.from}
                max={manual ? 286 : cur.to}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label={manual ? "Ayat akhir" : `Ayat akhir (${cur.from}–${cur.to})`}>
              <input
                type="number"
                className="w-full"
                min={manual ? 1 : cur.from}
                max={manual ? 286 : cur.to}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
            {manual && manualName.trim() && (
              <p className="text-xs text-slate-600 sm:col-span-2 lg:col-span-3">
                {matched > 0 ? (
                  <>
                    Cocok dengan surah ke-{matched}: <bdi lang="ar" dir="rtl">{surahArabic(matched)}</bdi> (
                    {SURAHS[matched - 1][1]} ayat). Dihitung ke juz dan pemeriksaan tumpang tindih.
                  </>
                ) : (
                  "Tidak cocok dengan daftar. Dicatat sebagai surah manual (tidak masuk perhitungan juz)."
                )}
              </p>
            )}
          </FormGroup>

          <FormGroup step={3} title="Penilaian">
            <Field label="Kualitas atau kelancaran">
              <select
                className="w-full"
                value={quality}
                onChange={(e) => setQuality(e.target.value as RecitationQuality)}
              >
                {RECITATION_QUALITIES.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            </Field>
          </FormGroup>

          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={save}>
              Catat setoran
            </button>
            {msg && <p className="text-sm" role="status">{msg}</p>}
          </div>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-2">Ringkasan per santri</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-2">Nama</th>
                <th className="p-2">Catatan</th>
                <th className="p-2">Ayat dihafal</th>
                <th className="p-2">Juz</th>
              </tr>
            </thead>
            <tbody>
              {rtqStudents.map((s) => (
                <tr key={s.id} className="border-t align-top">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{data.recitations.filter((r) => r.studentId === s.id).length}</td>
                  <td className="p-2">{totalMemorized(data.recitations, s.id)}</td>
                  <td className="p-2">{juzText(data.recitations, s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Dihitung dari setoran baru berkualitas Lancar atau Cukup. Surah manual yang namanya cocok dengan
          daftar dihitung seperti surah biasa. Yang tidak cocok hanya dihitung sebagai ayat, tanpa juz.
          Aturan ini menunggu pengesahan ustadz pembina.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="mb-2">Catatan per santri</h2>
        <StudentGroups
          entries={entries}
          flagLabel=""
          empty="Belum ada setoran tercatat."
          render={(id) => (
            <>
              <p className="text-sm text-slate-600">
                Dihafal {totalMemorized(data.recitations, id)} ayat. {juzText(data.recitations, id)}.
              </p>
              <DayGroups
                items={data.recitations.filter((r) => r.studentId === id)}
                getIso={(r) => r.date}
                render={(r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-white px-3 py-2 text-sm"
                  >
                    <span className="badge badge-accent">{r.kind}</span>
                    <bdi lang="ar" dir="rtl" className="text-base">{surahLabel(r.surahNo, r.surah)}</bdi>
                    <span>{r.from}–{r.to}</span>
                    {r.surahNo === 0 && <span className="badge">manual</span>}
                    <span className={`badge ml-auto ${QUALITY_BADGE[r.quality]}`}>{r.quality}</span>
                  </div>
                )}
              />
            </>
          )}
        />
      </section>
    </div>
  );
}