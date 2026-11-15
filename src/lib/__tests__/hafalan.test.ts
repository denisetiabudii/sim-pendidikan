import { describe, expect, it } from "vitest";
import { findOverlap, juzSummary, totalMemorized } from "../hafalan";
import type { Recitation } from "../types";

let n = 0;
const rec = (over: Partial<Recitation>): Recitation => ({
  id: String(++n),
  studentId: "s4",
  authorId: "u4",
  surahNo: 1,
  surah: "Al-Fatihah",
  date: "2026-11-15",
  kind: "Setoran baru",
  from: 1,
  to: 7,
  quality: "Lancar",
  createdAt: "",
  ...over,
});

describe("hafalan", () => {
  it("juz selesai dari beberapa setoran berurutan lintas surah", () => {
    const recs = [rec({}), rec({ surahNo: 2, surah: "Al-Baqarah", from: 1, to: 141 })];
    expect(totalMemorized(recs, "s4")).toBe(148);
    expect(juzSummary(recs, "s4").complete).toEqual([1]);
  });
  it("juz yang baru sebagian ditampilkan sebagai berjalan", () => {
    const recs = [rec({ surahNo: 114, surah: "An-Nas", from: 1, to: 6 })];
    const s = juzSummary(recs, "s4");
    expect(s.complete).toEqual([]);
    expect(s.partial).toEqual([{ juz: 30, done: 6, total: 564 }]);
  });
  it("murojaah dan setoran yang perlu diulang tidak dihitung", () => {
    const recs = [rec({ kind: "Murojaah" }), rec({ quality: "Perlu diulang" })];
    expect(totalMemorized(recs, "s4")).toBe(0);
  });
  it("mendeteksi tumpang tindih hanya untuk peserta yang sama", () => {
    const recs = [rec({ surahNo: 2, surah: "Al-Baqarah", from: 1, to: 10 })];
    expect(findOverlap(recs, "s4", 2, 10, 20)).toBeDefined();
    expect(findOverlap(recs, "s4", 2, 11, 20)).toBeUndefined();
    expect(findOverlap(recs, "s5", 2, 1, 10)).toBeUndefined();
    expect(findOverlap(recs, "s4", 3, 1, 10)).toBeUndefined();
  });
    it("surah manual dihitung sebagai ayat tetapi tidak masuk juz dan tumpang tindih", () => {
    const recs = [rec({ surahNo: 0, surah: "سورة خاصة", from: 1, to: 10 })];
    expect(totalMemorized(recs, "s4")).toBe(10);
    expect(juzSummary(recs, "s4")).toEqual({ complete: [], partial: [] });
    expect(findOverlap(recs, "s4", 0, 1, 10)).toBeUndefined();
  });
});