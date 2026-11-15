import { absIndex, juzProgress, mergeIntervals } from "./quran";
import type { Interval } from "./quran";
import type { Recitation } from "./types";

// Aturan sementara, menunggu keputusan ustadz pembina:
// hanya setoran baru dengan kualitas Lancar atau Cukup yang dihitung sebagai hafalan.
export const countsAsMemorized = (r: Recitation) =>
  r.kind === "Setoran baru" && r.quality !== "Perlu diulang";

const toInterval = (r: Recitation): Interval => [absIndex(r.surahNo, r.from), absIndex(r.surahNo, r.to)];

export function memorizedFor(recs: Recitation[], studentId: string): Interval[] {
  return mergeIntervals(
    recs
      .filter((r) => r.studentId === studentId && r.surahNo > 0 && countsAsMemorized(r))
      .map(toInterval)
  );
}

// Surah manual (nomor 0) dihitung sebagai ayat, tetapi tidak masuk perhitungan juz.
export function totalMemorized(recs: Recitation[], studentId: string): number {
  const catalog = memorizedFor(recs, studentId).reduce((a, [x, y]) => a + (y - x + 1), 0);
  const manual = recs
    .filter((r) => r.studentId === studentId && r.surahNo <= 0 && countsAsMemorized(r))
    .reduce((a, r) => a + (r.to - r.from + 1), 0);
  return catalog + manual;
}

export function findOverlap(
  recs: Recitation[],
  studentId: string,
  surahNo: number,
  from: number,
  to: number
): Recitation | undefined {
  if (surahNo <= 0) return undefined;
  const a = absIndex(surahNo, from);
  const b = absIndex(surahNo, to);
  return recs.find((r) => {
    if (r.studentId !== studentId || r.surahNo <= 0 || !countsAsMemorized(r)) return false;
    const [x, y] = toInterval(r);
    return x <= b && y >= a;
  });
}

export function juzSummary(recs: Recitation[], studentId: string) {
  const p = juzProgress(memorizedFor(recs, studentId));
  return {
    complete: p.filter((x) => x.done === x.total).map((x) => x.juz),
    partial: p.filter((x) => x.done > 0 && x.done < x.total),
  };
}

export function juzText(recs: Recitation[], studentId: string): string {
  const s = juzSummary(recs, studentId);
  const done = s.complete.length ? `Juz selesai: ${s.complete.join(", ")}` : "Belum ada juz selesai";
  const part = s.partial.length
    ? `; berjalan: ${s.partial.map((p) => `Juz ${p.juz} (${p.done}/${p.total} ayat)`).join(", ")}`
    : "";
  return done + part;
}