const TZ = "Asia/Jakarta";

// Kunci hari (YYYY-MM-DD) menurut Asia/Jakarta. Tanggal polos dipakai apa adanya.
export function dayKey(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

const shift = (key: string, days: number) => {
  const t = new Date(`${key}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};

export function dayLabel(key: string, today: string): string {
  if (today && key === today) return "Hari ini";
  if (today && key === shift(today, -1)) return "Kemarin";
  const d = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

// Hari terbaru dulu. Urutan item di dalam satu hari mengikuti urutan masukan.
export function groupByDay<T>(items: T[], getIso: (t: T) => string, today: string) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const k = dayKey(getIso(it));
    const list = map.get(k);
    if (list) list.push(it);
    else map.set(k, [it]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, list]) => ({ key, label: dayLabel(key, today), items: list }));
}