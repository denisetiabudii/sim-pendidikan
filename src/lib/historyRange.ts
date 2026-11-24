import { dayKey } from "./groupByDate";

export type RangeId = "24h" | "7d" | "30d";

export const RANGES: { id: RangeId; label: string; days: number }[] = [
  { id: "24h", label: "24 jam terakhir", days: 1 },
  { id: "7d", label: "7 hari terakhir", days: 7 },
  { id: "30d", label: "30 hari terakhir", days: 30 },
];
export const DEFAULT_RANGE: RangeId = "7d";
export const MORE_STEP_DAYS = 30; // tombol "Muat lebih lama" menambah sekian hari

const DAY = 86_400_000;

// Batas awal (epoch ms). `extraDays` adalah tambahan dari tombol "Muat lebih lama".
export const sinceMs = (nowMs: number, range: RangeId, extraDays = 0): number =>
  nowMs - ((RANGES.find((r) => r.id === range)?.days ?? 7) + extraDays) * DAY;

// Item ber-waktu penuh dibandingkan tepat pada waktunya. Item bertanggal polos (YYYY-MM-DD)
// dibandingkan per hari menurut Asia/Jakarta, jadi "24 jam" berarti hari ini dan kemarin.
// Tanggal yang tidak terbaca tetap ditampilkan supaya data tidak hilang diam-diam.
export function inRange(iso: string, since: number): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso >= dayKey(new Date(since).toISOString());
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? true : t >= since;
}
