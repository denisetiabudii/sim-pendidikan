import { describe, expect, it } from "vitest";
import { SURAHS, SURAH_AR, matchSurah, TOTAL_AYAT, JUZ_START, juzBounds, juzOf, surahByNo, surahLabel, surahOption, surahsInJuz, validateAyatRange } from "../quran";

describe("data surah", () => {
  it("114 surah dengan total 6.236 ayat", () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((a, [, n]) => a + n, 0)).toBe(6236);
  });
  it("beberapa surah sesuai mushaf", () => {
    expect(surahByNo(1)).toMatchObject({ name: "Al-Fatihah", ayat: 7 });
    expect(surahByNo(2)).toMatchObject({ name: "Al-Baqarah", ayat: 286 });
    expect(surahByNo(36)).toMatchObject({ name: "Yasin", ayat: 83 });
    expect(surahByNo(67)).toMatchObject({ name: "Al-Mulk", ayat: 30 });
    expect(surahByNo(112)).toMatchObject({ name: "Al-Ikhlas", ayat: 4 });
    expect(surahByNo(114)).toMatchObject({ name: "An-Nas", ayat: 6 });
  });
  it("nomor di luar 1–114 tidak valid", () => {
    expect(surahByNo(0)).toBeUndefined();
    expect(surahByNo(115)).toBeUndefined();
    expect(surahByNo(1.5)).toBeUndefined();
  });
});

describe("validateAyatRange", () => {
  it("menerima rentang yang ada", () => {
    expect(validateAyatRange(1, 1, 7)).toBeNull();
    expect(validateAyatRange(2, 255, 255)).toBeNull();
    expect(validateAyatRange(2, 1, 286)).toBeNull();
  });
  it("menolak rentang di luar jumlah ayat surah", () => {
    expect(validateAyatRange(1, 1, 8)).toContain("hanya memiliki 7 ayat");
    expect(validateAyatRange(114, 1, 7)).toContain("hanya memiliki 6 ayat");
    expect(validateAyatRange(2, 1, 287)).not.toBeNull();
  });
  it("menolak awal 0, akhir < awal, bukan bilangan bulat, dan surah tak dikenal", () => {
    expect(validateAyatRange(1, 0, 3)).not.toBeNull();
    expect(validateAyatRange(1, 5, 3)).not.toBeNull();
    expect(validateAyatRange(1, 1.5, 3)).not.toBeNull();
    expect(validateAyatRange(999, 1, 1)).toContain("Surah tidak valid");
  });

  describe("pembagian juz", () => {
  it("30 juz, total 6.236 ayat, jumlah ayat per juz sesuai mushaf", () => {
    expect(JUZ_START).toHaveLength(30);
    const sizes = Array.from({ length: 30 }, (_, i) => {
      const { start, end } = juzBounds(i + 1);
      return end - start + 1;
    });
    expect(sizes).toEqual([
      148, 111, 126, 131, 124, 110, 149, 142, 159, 127, 151, 170, 154, 227, 185, 269, 190, 202,
      339, 171, 178, 169, 357, 175, 246, 195, 399, 137, 431, 564,
    ]);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(TOTAL_AYAT);
    expect(TOTAL_AYAT).toBe(6236);
  });
  it("menentukan juz dari surah dan ayat", () => {
    expect(juzOf(1, 1)).toBe(1);
    expect(juzOf(2, 141)).toBe(1);
    expect(juzOf(2, 142)).toBe(2);
    expect(juzOf(2, 252)).toBe(2);
    expect(juzOf(2, 253)).toBe(3);
    expect(juzOf(77, 50)).toBe(29);
    expect(juzOf(78, 1)).toBe(30);
    expect(juzOf(114, 6)).toBe(30);
  });
});
describe("surahsInJuz", () => {
  it("Juz 1, 2, dan 3 membelah Al-Baqarah di batas yang benar", () => {
    expect(surahsInJuz(1)).toEqual([
      { no: 1, name: "Al-Fatihah", from: 1, to: 7 },
      { no: 2, name: "Al-Baqarah", from: 1, to: 141 },
    ]);
    expect(surahsInJuz(2)).toEqual([{ no: 2, name: "Al-Baqarah", from: 142, to: 252 }]);
    expect(surahsInJuz(3)).toEqual([
      { no: 2, name: "Al-Baqarah", from: 253, to: 286 },
      { no: 3, name: "Ali Imran", from: 1, to: 92 },
    ]);
  });
  it("Juz 30 berisi 37 surah dari An-Naba sampai An-Nas", () => {
    const p = surahsInJuz(30);
    expect(p).toHaveLength(37);
    expect(p[0]).toEqual({ no: 78, name: "An-Naba", from: 1, to: 40 });
    expect(p[36]).toEqual({ no: 114, name: "An-Nas", from: 1, to: 6 });
  });
  it("seluruh juz menutup 6.236 ayat tanpa celah atau tumpang tindih", () => {
    let total = 0;
    for (let j = 1; j <= 30; j++) for (const x of surahsInJuz(j)) total += x.to - x.from + 1;
    expect(total).toBe(6236);
  });
});
describe("label surah Arab", () => {
  it("memakai nama Arab dari satu sumber, dan nama manual bila nomor 0", () => {
    expect(surahLabel(114)).toBe("الناس");
    expect(surahLabel(0, "سورة خاصة")).toBe("سورة خاصة");
  });
  it("teks dropdown mengisolasi bagian Arab agar urutan tidak terbalik", () => {
    expect(surahOption(2, "286 ayat")).toBe("2. \u2067البقرة\u2069 · 286 ayat");
  });
});
describe("matchSurah", () => {
  it("setiap nama Arab dan Latin di daftar cocok dengan surahnya sendiri", () => {
    for (let i = 0; i < 114; i++) {
      expect(matchSurah(SURAH_AR[i])).toBe(i + 1);
      expect(matchSurah(SURAHS[i][0])).toBe(i + 1);
    }
  });
  it("toleran terhadap harakat, ال, hamzah, spasi, dan kapital", () => {
    expect(matchSurah("البَقَرَة")).toBe(2);
    expect(matchSurah("بقرة")).toBe(2);
    expect(matchSurah("آل عمران")).toBe(3);
    expect(matchSurah("al baqarah")).toBe(2);
    expect(matchSurah("BAQARAH")).toBe(2);
    expect(matchSurah("ali imran")).toBe(3);
    expect(matchSurah("ص")).toBe(38);
  });
  it("mengenali nama alternatif, dan menolak yang tidak dikenal", () => {
    expect(matchSurah("اللهب")).toBe(111);
    expect(matchSurah("براءة")).toBe(9);
    expect(matchSurah("سورة خاصة")).toBe(0);
    expect(matchSurah("xyz")).toBe(0);
    expect(matchSurah("  ")).toBe(0);
  });
});
});

