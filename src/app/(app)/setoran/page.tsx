"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { canSeeStudent, myGroupIds, myStudentIds } from "@/lib/access";
import { RECITATION_KINDS, RECITATION_QUALITIES } from "@/lib/constants";
import { juzText, totalMemorized } from "@/lib/hafalan";
import {
  SURAHS,
  isolateAr,
  matchSurah,
  surahArabic,
  surahLabel,
  surahOption,
  surahsInJuz,
  validateAyatRange,
} from "@/lib/quran";
import type { JuzPart } from "@/lib/quran";
import type { RecitationKind, RecitationQuality } from "@/lib/types";
import { useUser } from "@/lib/useUser";

const fmt = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function Setoran() {
  const { data, addRecitation } = useStore();
  const user = useUser();
  const today = useToday();

  const rtqStudents = myStudentIds(data, user)
    .map((id) => data.students[id])
    .filter((s) => data.groups[s.groupId].unit === "RTQ");
  const hasRtq =
    myGroupIds(data, user).some((g) => data.groups[g].unit === "RTQ") ||
    user.role === "wali";
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

  const studentId = rtqStudents.some((s) => s.id === sid)
    ? sid
    : rtqStudents[0]?.id;
  const date = pickedDate || today;
  const options: JuzPart[] = juz
    ? surahsInJuz(juz)
    : SURAHS.map(([name, ayat], i) => ({ no: i + 1, name, from: 1, to: ayat }));
  const manual = surahNo === -1;
  const cur = options.find((o) => o.no === surahNo) ?? options[0];
  const matched = manual ? matchSurah(manualName) : 0;

  const list = data.recitations
    .filter((r) => canSeeStudent(data, user, r.studentId))
    .slice(0, 30);

  function save() {
    if (!studentId || !date) return;
    if (!from || !to) return setMsg("Isi ayat awal dan ayat akhir.");
    const f = Number(from);
    const t = Number(to);

    if (!manual) {
      const rangeError = validateAyatRange(cur.no, f, t); // jumlah ayat surah dulu
      if (rangeError) return setMsg(rangeError);
      if (juz && (f < cur.from || t > cur.to))
        return setMsg(
          `Di Juz ${juz}, ${isolateAr(surahLabel(cur.no))} hanya ayat ${cur.from}–${cur.to}. ` +
            `Pilih "Semua juz" bila rentangnya melewati batas juz.`,
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
    if (
      !r.ok &&
      r.code === "overlap" &&
      confirm(`${r.error}\n\nTetap catat sebagai setoran baru?`)
    )
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
      <div>
        <h1 className="mb-3 text-xl font-bold">Setoran hafalan</h1>
        <p className="rounded border bg-white p-3 text-sm text-slate-600">
          Setoran hafalan hanya untuk peserta RTQ. Tidak ada peserta RTQ dalam
          cakupan Anda.
        </p>
      </div>
    );

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Setoran hafalan</h1>

      {canRecord && (
        <section className="mb-4 rounded border bg-white p-3">
          <h2 className="mb-2 font-semibold">Catat setoran</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            <select
              className="rounded border bg-white p-2 text-sm"
              value={studentId ?? ""}
              onChange={(e) => setSid(e.target.value)}
              aria-label="Peserta"
            >
              {rtqStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded border p-2 text-sm"
              value={date}
              onChange={(e) => setPickedDate(e.target.value)}
              aria-label="Tanggal"
            />
            <select
              className="rounded border bg-white p-2 text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as RecitationKind)}
              aria-label="Jenis"
            >
              {RECITATION_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className="rounded border bg-white p-2 text-sm"
              value={juz}
              onChange={(e) => {
                setJuz(Number(e.target.value));
                if (!manual) setSurahNo(0);
                setFrom("");
                setTo("");
              }}
              aria-label="Juz"
            >
              <option value={0}>Semua juz</option>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
                <option key={j} value={j}>
                  Juz {j}
                </option>
              ))}
            </select>

            <select
              dir="ltr"
              className="rounded border bg-white p-2 text-sm"
              value={manual ? -1 : cur.no}
              onChange={(e) => {
                setSurahNo(Number(e.target.value));
                setFrom("");
                setTo("");
              }}
              aria-label="Surah"
            >
              {options.map((o) => (
                <option key={o.no} value={o.no}>
                  {surahOption(
                    o.no,
                    juz ? `ayat ${o.from}–${o.to}` : `${o.to} ayat`,
                  )}
                </option>
              ))}
              <option value={-1}>Tulis manual…</option>
            </select>

            {manual && (
              <>
                {" "}
                <input
                  dir="auto"
                  className="rounded border p-2 text-sm"
                  placeholder="Nama surah (manual)"
                  maxLength={50}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  aria-label="Nama surah manual"
                />
                {manual && manualName.trim() && (
                  <p className="w-full text-xs text-slate-600">
                    {matched > 0 ? (
                      <>
                        Cocok dengan surah ke-{matched}:{" "}
                        <bdi lang="ar" dir="rtl">
                          {surahArabic(matched)}
                        </bdi>{" "}
                        ({SURAHS[matched - 1][1]} ayat). Dihitung ke juz dan
                        pemeriksaan tumpang tindih.
                      </>
                    ) : (
                      "Tidak cocok dengan daftar. Dicatat sebagai surah manual (tidak masuk perhitungan juz)."
                    )}
                  </p>
                )}
              </>
            )}

            <input
              type="number"
              min={manual ? 1 : cur.from}
              max={manual ? 286 : cur.to}
              className="w-32 rounded border p-2 text-sm"
              placeholder={
                manual ? "Ayat awal" : `Ayat awal (${cur.from}–${cur.to})`
              }
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Ayat awal"
            />
            <input
              type="number"
              min={manual ? 1 : cur.from}
              max={manual ? 286 : cur.to}
              className="w-32 rounded border p-2 text-sm"
              placeholder={
                manual ? "Ayat akhir" : `Ayat akhir (${cur.from}–${cur.to})`
              }
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Ayat akhir"
            />
            <select
              className="rounded border bg-white p-2 text-sm"
              value={quality}
              onChange={(e) => setQuality(e.target.value as RecitationQuality)}
              aria-label="Kualitas"
            >
              {RECITATION_QUALITIES.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
            <button
              className="rounded bg-teal-700 px-3 py-2 text-sm text-white"
              onClick={save}
            >
              Catat setoran
            </button>
          </div>
          {msg && <p className="mt-2 text-sm">{msg}</p>}
        </section>
      )}

      <section className="mb-4 rounded border bg-white p-3">
        <h2 className="mb-2 font-semibold">Ringkasan per peserta</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="p-1">Nama</th>
                <th className="p-1">Catatan</th>
                <th className="p-1">Ayat dihafal</th>
                <th className="p-1">Juz</th>
              </tr>
            </thead>
            <tbody>
              {rtqStudents.map((s) => (
                <tr key={s.id} className="border-t align-top">
                  <td className="p-1">{s.name}</td>
                  <td className="p-1">
                    {
                      data.recitations.filter((r) => r.studentId === s.id)
                        .length
                    }
                  </td>
                  <td className="p-1">
                    {totalMemorized(data.recitations, s.id)}
                  </td>
                  <td className="p-1">{juzText(data.recitations, s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Dihitung dari setoran baru berkualitas Lancar atau Cukup. Surah manual
          yang namanya cocok dengan daftar dihitung seperti surah biasa. Yang
          tidak cocok hanya dihitung sebagai ayat, tanpa juz. Aturan ini
          menunggu pengesahan ustadz pembina.
        </p>
      </section>

      <section className="rounded border bg-white p-3">
        <h2 className="mb-2 font-semibold">Catatan terbaru</h2>
        {list.length === 0 && (
          <p className="text-sm text-slate-500">Belum ada setoran tercatat.</p>
        )}
        <ul className="space-y-1 text-sm">
          {list.map((r) => (
            <li
              key={r.id}
              className="border-t pt-1 first:border-t-0 first:pt-0"
            >
              <span className="text-slate-500">{fmt(r.date)}</span> ·{" "}
              <b>{data.students[r.studentId].name}</b> · {r.kind}:{" "}
              <bdi lang="ar" dir="rtl">
                {surahLabel(r.surahNo, r.surah)}
              </bdi>{" "}
              {r.from}–{r.to}
              {r.surahNo === 0 && (
                <span className="ml-1 rounded border px-1 text-xs">manual</span>
              )}{" "}
              ·{" "}
              <span
                className={r.quality === "Perlu diulang" ? "text-red-700" : ""}
              >
                {r.quality}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
