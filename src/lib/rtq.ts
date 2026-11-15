import { countsAsMemorized } from "./hafalan";
import { matchSurah, surahArabic, surahByNo, validateAyatRange } from "./quran";
import type { Academic, AppData, Predikat, Quarter, Recitation, RtqAspect, RtqReport, RtqSurahRow } from "./types";

export const PREDIKAT: Predikat[] = ["A", "A-", "B", "B-", "C", "C-", "D", "D-"];
export const MAX_ROWS = 10;
export const rtqKey = (studentId: string, year: string, quarter: number) => `${studentId}|${year}|${quarter}`;

// Tabel predikat Tahsin & Tahfidz dari lembar evaluasi klien.
export const BANDS: { predikat: Predikat; name: string; min: number; max: number }[] = [
  { predikat: "A", name: "Mumtaz", min: 95, max: 100 },
  { predikat: "A-", name: "Mumtaz", min: 90, max: 94 },
  { predikat: "B", name: "Jayyid Jiddan", min: 85, max: 89 },
  { predikat: "B-", name: "Jayyid Jiddan", min: 80, max: 84 },
  { predikat: "C", name: "Jayyid", min: 75, max: 79 },
  { predikat: "C-", name: "Jayyid", min: 70, max: 74 },
  { predikat: "D", name: "Maqbul", min: 65, max: 69 },
  { predikat: "D-", name: "Maqbul", min: 60, max: 64 },
];

export const AKHLAK_LEGEND: Record<Predikat, string> = {
  A: "Sangat Baik", "A-": "Baik Sekali", B: "Baik", "B-": "Cukup Baik",
  C: "Cukup", "C-": "Perlu Pembinaan", D: "Perlu Bimbingan", "D-": "Memerlukan Bimbingan Intensif",
};

// Narasi awal untuk predikat A, diambil dari contoh klien. Guru wajib menyesuaikan.
export const DEFAULT_TEXT: Record<string, string> = {
  tuturKata: "Ananda bertutur kata dengan sopan, santun, dan lemah lembut kepada ustaz/ustazah serta teman-temannya.",
  sikap: "Ananda menunjukkan sikap yang baik, menghormati ustaz/ustazah, menaati arahan, dan mampu menjaga adab selama kegiatan pembelajaran.",
  kelancaran: "Ananda mampu membaca dan menghafal dengan lancar, baik, dan minim kesalahan.",
  makhraj: "Ananda mampu melafalkan huruf hijaiyah dengan tepat sesuai makhraj dan sifat hurufnya.",
  tajwid: "Ananda mampu menerapkan hukum tajwid dengan tepat saat membaca Al-Qur'an.",
};

// Aturan sementara (menunggu klien): pembulatan ke bilangan bulat, di bawah 60 tanpa predikat.
export function tahfidzPredikat(avg: number | null) {
  if (avg === null) return null;
  const r = Math.round(avg);
  return BANDS.find((b) => r >= b.min && r <= b.max) ?? null;
}

// (jumlah nilai harian + jumlah nilai evaluasi) / jumlah seluruh nilai yang terisi.
export function tahfidzAverage(rows: RtqSurahRow[]): number | null {
  const v = rows.flatMap((r) => [r.harian, r.evaluasi]).filter((x): x is number => x !== null);
  if (v.length === 0) return null;
  return Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10;
}

export const ziyadah = (rows: RtqSurahRow[]) =>
  rows.reduce((a, r) => a + (r.to >= r.from && r.from >= 1 ? r.to - r.from + 1 : 0), 0);

export const rowName = (r: RtqSurahRow) => (r.surahNo > 0 ? surahArabic(r.surahNo) : r.name);
export const fmtNum = (n: number | null) => (n === null ? "–" : String(n).replace(".", ","));

const emptyAspect = (): RtqAspect => ({ predikat: "", text: "" });

export function newRtqReport(studentId: string, year: string, quarter: Quarter): RtqReport {
  return {
    studentId, year, quarter, status: "draft", version: 1,
    akhlak: { tuturKata: emptyAspect(), sikap: emptyAspect() },
    tahsin: { kelancaran: emptyAspect(), makhraj: emptyAspect(), tajwid: emptyAspect() },
    tahfidz: [], catatan: "",
  };
}

export function currentQuarter(a: Academic, today: string): Quarter {
  const i = a.quarters.findIndex((q) => today >= q.start && today <= q.end);
  return ((i >= 0 ? i : 0) + 1) as Quarter;
}

export function absenceCounts(data: AppData, studentId: string, start: string, end: string) {
  const rec = data.attendance.filter((a) => a.studentId === studentId && a.date >= start && a.date <= end);
  const n = (s: string) => rec.filter((a) => a.status === s).length;
  return { sakit: n("Sakit"), izin: n("Izin"), tanpa: n("Alpa") };
}

// Menyusun baris tabel tahfidz dari setoran baru dalam kuartal, digabung per surah.
export function rowsFromRecitations(recs: Recitation[], studentId: string, start: string, end: string): RtqSurahRow[] {
  const list = recs
    .filter((r) => r.studentId === studentId && r.date >= start && r.date <= end && countsAsMemorized(r))
    .sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, RtqSurahRow>();
  for (const r of list) {
    const k = r.surahNo > 0 ? `n${r.surahNo}` : `m${r.surah}`; // surah manual digabung per nama
    const cur = map.get(k);
    if (cur) {
      cur.from = Math.min(cur.from, r.from);
      cur.to = Math.max(cur.to, r.to);
    } else map.set(k, { surahNo: r.surahNo, name: r.surah, from: r.from, to: r.to, harian: null, evaluasi: null });
  }
  return [...map.values()].slice(0, MAX_ROWS);
}

export function validateTahfidzRows(rows: RtqSurahRow[]): string | null {
  if (rows.length > MAX_ROWS) return `Maksimal ${MAX_ROWS} surah per kuartal`;
  for (const [i, r] of rows.entries()) {
    const n = i + 1;
    if (r.surahNo > 0) {
      const e = validateAyatRange(r.surahNo, r.from, r.to);
      if (e) return `Baris ${n}: ${e}`;
    } else {
      if (!r.name.trim() || r.name.length > 50) return `Baris ${n}: nama surah wajib diisi (maks 50 karakter)`;
      if (!Number.isInteger(r.from) || !Number.isInteger(r.to) || r.from < 1 || r.to < r.from)
        return `Baris ${n}: rentang ayat tidak valid`;
    }
    for (const v of [r.harian, r.evaluasi])
      if (v !== null && (Number.isNaN(v) || v < 0 || v > 100)) return `Baris ${n}: nilai harus 0–100`;
  }
  return null;
}

// Kelengkapan yang diwajibkan sebelum rapor diajukan.
export function reportProblems(r: RtqReport): string[] {
  const p: string[] = [];
  const aspects = { ...r.akhlak, ...r.tahsin } as Record<string, RtqAspect>;
  for (const [k, a] of Object.entries(aspects))
    if (!a.predikat || !a.text.trim()) p.push(`Aspek "${k}" belum lengkap (predikat dan keterangan)`);
  if (r.tahfidz.length === 0) p.push("Tabel tahfidz masih kosong");
  if (r.tahfidz.some((x) => x.harian === null || x.evaluasi === null)) p.push("Ada nilai harian atau evaluasi yang belum diisi");
  return p;
}

// Baris dengan nama manual yang cocok dengan daftar diubah menjadi surah biasa.
export function resolveManualRows(rows: RtqSurahRow[]): RtqSurahRow[] {
  return rows.map((r) => {
    if (r.surahNo > 0) return r;
    const m = matchSurah(r.name);
    return m > 0 ? { ...r, surahNo: m, name: surahByNo(m)?.name ?? r.name } : r;
  });
}