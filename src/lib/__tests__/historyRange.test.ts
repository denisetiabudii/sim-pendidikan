import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, MORE_STEP_DAYS, RANGES, inRange, sinceMs } from "../historyRange";

// 21 Nov 2026 12:00 WIB = 05:00 UTC
const NOW = Date.parse("2026-11-21T05:00:00.000Z");
const DAY = 86_400_000;

describe("rentang riwayat", () => {
  it("tiga pilihan: 24 jam, 7 hari, 30 hari; bawaan 7 hari", () => {
    expect(RANGES.map((r) => [r.id, r.days])).toEqual([["24h", 1], ["7d", 7], ["30d", 30]]);
    expect(DEFAULT_RANGE).toBe("7d");
    expect(MORE_STEP_DAYS).toBe(30);
  });
  it("sinceMs menghitung batas awal dan menambah hari dari tombol muat lebih lama", () => {
    expect(sinceMs(NOW, "24h")).toBe(NOW - DAY);
    expect(sinceMs(NOW, "7d")).toBe(NOW - 7 * DAY);
    expect(sinceMs(NOW, "30d")).toBe(NOW - 30 * DAY);
    expect(sinceMs(NOW, "7d", 30)).toBe(NOW - 37 * DAY);
  });
  it("item ber-waktu penuh dibandingkan tepat pada waktunya", () => {
    const since = sinceMs(NOW, "24h");
    expect(inRange("2026-11-20T06:00:00.000Z", since)).toBe(true); // 23 jam lalu
    expect(inRange("2026-11-20T04:00:00.000Z", since)).toBe(false); // 25 jam lalu
    expect(inRange(new Date(since).toISOString(), since)).toBe(true); // tepat di batas
  });
  it("item bertanggal polos dibandingkan per hari WIB: 24 jam = hari ini dan kemarin", () => {
    const since = sinceMs(NOW, "24h");
    expect(inRange("2026-11-21", since)).toBe(true);
    expect(inRange("2026-11-20", since)).toBe(true);
    expect(inRange("2026-11-19", since)).toBe(false);
    const since7 = sinceMs(NOW, "7d");
    expect(inRange("2026-11-14", since7)).toBe(true);
    expect(inRange("2026-11-13", since7)).toBe(false);
  });
  it("batas hari mengikuti zona Jakarta, bukan UTC", () => {
    // 21 Nov 00:30 WIB = 20 Nov 17:30 UTC; sekarang 21 Nov 00:45 WIB
    const now = Date.parse("2026-11-20T17:45:00.000Z");
    expect(inRange("2026-11-20", sinceMs(now, "24h"))).toBe(true);
    expect(inRange("2026-11-19", sinceMs(now, "24h"))).toBe(false);
  });
  it("tanggal yang tidak terbaca tetap ditampilkan", () => {
    expect(inRange("bukan-tanggal", sinceMs(NOW, "24h"))).toBe(true);
  });
});
