import type { AppData, Component, Unit } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const weightsTotal = (components: Component[]) =>
  components.reduce((sum, c) => sum + c.weight, 0);

export const weightsValid = (components: Component[]) =>
  weightsTotal(components) === 100;

/**
 * Nilai akhir berbobot. Mengembalikan null bila ada komponen yang belum diisi
 * atau bobot tidak 100. Aturan nilai kosong resmi masih menunggu keputusan akademik.
 */
export function finalScore(
  components: Component[],
  scores: Record<string, number> | undefined
): number | null {
  if (!weightsValid(components)) return null;
  if (!scores) return null;
  let total = 0;
  for (const c of components) {
    const v = scores[c.name];
    if (v === undefined || Number.isNaN(v)) return null;
    total += v * c.weight;
  }
  return round2(total / 100);
}

// Ambang contoh. Ganti setelah predikat resmi disahkan.
export function predicate(score: number | null): string {
  if (score === null) return "Belum lengkap";
  if (score >= 90) return "Mumtaz";
  if (score >= 80) return "Jayyid Jiddan";
  if (score >= 70) return "Jayyid";
  return "Perlu pendampingan";
}

// BR-05: nilai tidak boleh diubah setelah rapor disetujui atau dipublikasikan.
export function isScoreLocked(data: AppData, studentId: string): boolean {
  const s = data.reports[studentId]?.status;
  return s === "approved" || s === "published";
}

// BR-06: bobot terkunci bila di unit itu sudah ada rapor disetujui atau dipublikasikan.
export function weightsLocked(data: AppData, unit: Unit): boolean {
  return Object.entries(data.reports).some(
    ([sid, r]) =>
      (r.status === "approved" || r.status === "published") &&
      data.groups[data.students[sid].groupId].unit === unit
  );
}