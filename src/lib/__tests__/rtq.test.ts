import { describe, expect, it } from "vitest";
import { absenceCounts, currentQuarter, rowsFromRecitations, tahfidzAverage, tahfidzPredikat, validateTahfidzRows, ziyadah } from "../rtq";
import { SURAH_AR, surahArabic } from "../quran";
import { demoData } from "../demo";
import { seed } from "../seed";
import type { Recitation, RtqSurahRow } from "../types";

const row = (surahNo: number, from: number, to: number, harian: number | null, evaluasi: number | null): RtqSurahRow =>
  ({ surahNo, name: "", from, to, harian, evaluasi });

// Contoh dari lembar evaluasi klien (Kuartal 1).
const sample = [row(104, 1, 9, 80, 95), row(103, 1, 3, 80, 95), row(102, 1, 8, 79, 95), row(101, 1, 11, 80, 85), row(100, 1, 11, 88, 95)];

describe("rumus rapor RTQ", () => {
  it("rata-rata sesuai contoh klien: 87,2, B, Jayyid Jiddan, ziyadah 42", () => {
    expect(tahfidzAverage(sample)).toBe(87.2);
    expect(tahfidzPredikat(87.2)).toMatchObject({ predikat: "B", name: "Jayyid Jiddan" });
    expect(ziyadah(sample)).toBe(42);
  });
  it("rata-rata null bila belum ada nilai, dan hanya menghitung nilai yang terisi", () => {
    expect(tahfidzAverage([])).toBeNull();
    expect(tahfidzAverage([row(1, 1, 7, 80, null)])).toBe(80);
  });
  it("batas predikat", () => {
    expect(tahfidzPredikat(100)?.predikat).toBe("A");
    expect(tahfidzPredikat(95)?.predikat).toBe("A");
    expect(tahfidzPredikat(94)?.predikat).toBe("A-");
    expect(tahfidzPredikat(60)?.predikat).toBe("D-");
    expect(tahfidzPredikat(59)).toBeNull();
    expect(tahfidzPredikat(null)).toBeNull();
  });
});

describe("tabel tahfidz", () => {
  it("validasi ayat, nilai, dan jumlah baris", () => {
    expect(validateTahfidzRows(sample)).toBeNull();
    expect(validateTahfidzRows([row(1, 1, 8, 80, 80)])).toContain("hanya memiliki 7 ayat");
    expect(validateTahfidzRows([row(1, 1, 7, 101, 80)])).toContain("0–100");
    expect(validateTahfidzRows([{ ...row(0, 1, 3, 80, 80), name: "" }])).toContain("nama surah");
    expect(validateTahfidzRows([{ ...row(0, 1, 3, 80, 80), name: "سورة خاصة" }])).toBeNull();
    expect(validateTahfidzRows(Array.from({ length: 11 }, () => row(1, 1, 7, 80, 80)))).toContain("Maksimal");
  });
  it("menyusun baris dari setoran baru dalam kuartal, digabung per surah", () => {
    const rc = (id: string, date: string, surahNo: number, from: number, to: number, kind: Recitation["kind"] = "Setoran baru"): Recitation =>
      ({ id, studentId: "s4", authorId: "u4", surahNo, surah: "X", date, kind, from, to, quality: "Lancar", createdAt: "" });
    const recs = [rc("1", "2026-08-01", 114, 1, 3), rc("2", "2026-08-05", 114, 4, 6), rc("3", "2026-09-01", 112, 1, 4), rc("4", "2026-09-02", 1, 1, 7, "Murojaah"), rc("5", "2026-11-02", 111, 1, 5)];
    const rows = rowsFromRecitations(recs, "s4", "2026-07-01", "2026-10-31");
    expect(rows.map((r) => [r.surahNo, r.from, r.to])).toEqual([[114, 1, 6], [112, 1, 4]]);
  });
});

describe("kuartal dan absensi", () => {
  it("menentukan kuartal berjalan", () => {
    const a = seed().academic;
    expect(currentQuarter(a, "2026-09-10")).toBe(1);
    expect(currentQuarter(a, "2026-11-15")).toBe(2);
    expect(currentQuarter(a, "2027-04-01")).toBe(3);
  });
  it("menghitung sakit, izin, dan tanpa keterangan (Alpa) dalam rentang", () => {
    const d = seed();
    d.attendance.push(
      { studentId: "s4", groupId: "H1", date: "2026-09-01", status: "Sakit" },
      { studentId: "s4", groupId: "H1", date: "2026-09-02", status: "Izin" },
      { studentId: "s4", groupId: "H1", date: "2026-09-03", status: "Alpa" },
      { studentId: "s4", groupId: "H1", date: "2026-09-04", status: "Terlambat" },
      { studentId: "s4", groupId: "H1", date: "2026-11-02", status: "Sakit" }
    );
    expect(absenceCounts(d, "s4", "2026-07-01", "2026-10-31")).toEqual({ sakit: 1, izin: 1, tanpa: 1 });
  });
});

describe("nama surah Arab", () => {
  it("114 nama, dan lima nama contoh klien cocok", () => {
    expect(SURAH_AR).toHaveLength(114);
    expect([104, 103, 102, 101, 100].map(surahArabic)).toEqual(["الهمزة", "العصر", "التكاثر", "القارعة", "العاديات"]);
  });
});

describe("data demo", () => {
  it("rapor Hanif kuartal 1 meniru contoh klien", () => {
    const d = demoData("2026-11-15");
    const r = Object.values(d.rtqReports)[0];
    expect(tahfidzAverage(r.tahfidz)).toBe(87.2);
    expect(ziyadah(r.tahfidz)).toBe(42);
  });
});