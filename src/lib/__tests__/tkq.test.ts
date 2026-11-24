import { describe, expect, it } from "vitest";
import {
  BIO_FIELDS, cleanPai, defaultPaiTemplate, emptyBio, newTkqReport, paiProgress, paiTotals,
  ratedItems, ratingsFor, reportProblemsTkq, validateBio, validateTkq,
} from "../tkq";
import { demoData } from "../demo";
import { rtqKey } from "../rtq";

const T = defaultPaiTemplate();
const ok = () => ({ ...newTkqReport("s1", "2026/2027", 1), pai: ratingsFor(T, () => "BSH" as const) });

describe("template PAI dari berkas klien", () => {
  it("6 bagian, 56 indikator, 32 surah, satu sub-judul, id unik", () => {
    expect(T.map((s) => s.no)).toEqual(["I", "II", "III", "IV", "V", "VI"]);
    expect(ratedItems(T)).toHaveLength(56);
    expect(paiProgress(T, {}).map((p) => p.total)).toEqual([5, 3, 4, 34, 7, 3]);
    expect(T[3].items.filter((i) => i.text.startsWith("Surat "))).toHaveLength(32);
    expect(T[1].items[0]).toMatchObject({ heading: true, text: "Adab terhadap orangtua" });
    const ids = T.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("progres, total, dan pembuangan indikator yang sudah tidak ada", () => {
    const pai = { "sI-1": "BB" as const, "sI-2": "MB" as const };
    expect(paiTotals(T, pai)).toEqual({ done: 2, total: 56 });
    expect(paiProgress(T, pai)[0]).toMatchObject({ done: 2, total: 5 });
    expect(cleanPai(T, { ...pai, zzz: "BB" })).toEqual(pai);
    expect(paiTotals(T, ratingsFor(T, () => "BSB"))).toEqual({ done: 56, total: 56 });
  });
});

describe("validasi rapor TKQ", () => {
  const base = ok();
  it("rapor kosong punya tiga masalah, rapor lengkap tidak", () => {
    expect(reportProblemsTkq(newTkqReport("s1", "2026/2027", 1), T)).toHaveLength(3);
    const full = {
      ...base,
      capaian: { agama: "a", jatiDiri: "b", literasi: "c" },
      projek: { topik: "T", fase: "Fondasi", dimensi: { iman: "1", kebinekaan: "2", gotong: "3", mandiri: "4", kreatif: "5", nalar: "6" } },
    };
    expect(reportProblemsTkq(full, T)).toEqual([]);
    expect(reportProblemsTkq({ ...full, projek: { ...full.projek, topik: " " } }, T)).toHaveLength(1);
  });
  it("penilaian harus BB, MB, BSH, atau BSB, dan pertumbuhan dibatasi", () => {
    expect(validateTkq(base)).toBeNull();
    expect(validateTkq({ ...base, pai: { "sI-1": "XX" as never } })).toContain("BB, MB, BSH");
    expect(validateTkq({ ...base, pertumbuhan: { bb: 500, tb: null, lk: null } })).toContain("Berat badan");
    expect(validateTkq({ ...base, pertumbuhan: { bb: 18, tb: 10, lk: null } })).toContain("Tinggi badan");
    expect(validateTkq({ ...base, pertumbuhan: { bb: 18, tb: 110, lk: 50 } })).toBeNull();
    expect(validateTkq({ ...base, capaian: { agama: "x".repeat(2001), jatiDiri: "", literasi: "" } })).toContain("terlalu panjang");
  });
});

describe("biodata", () => {
  it("kolom, panjang, tanggal, telepon, dan anak ke divalidasi", () => {
    expect(BIO_FIELDS).toHaveLength(20);
    expect(validateBio(emptyBio())).toBeNull();
    expect(validateBio({ ...emptyBio(), birthDate: "2021-02-30" })).toContain("Tanggal lahir");
    expect(validateBio({ ...emptyBio(), birthDate: "2021-03-14" })).toBeNull();
    expect(validateBio({ ...emptyBio(), phone: "08ab" })).toContain("Telepon");
    expect(validateBio({ ...emptyBio(), phone: "+62 812-3456" })).toBeNull();
    expect(validateBio({ ...emptyBio(), childNo: "123" })).toContain("Anak ke");
    expect(validateBio({ ...emptyBio(), gender: "X" })).toContain("Jenis kelamin");
    expect(validateBio({ ...emptyBio(), street: "x".repeat(201) })).toContain("terlalu panjang");
  });
});

describe("data demo rapor TKQ", () => {
  const d = demoData("2026-11-15");
  const rep = (id: string) => d.tkqReports[rtqKey(id, d.academic.year, 1)];
  it("status dan kelengkapan sesuai rancangan", () => {
    expect(["s1", "s2", "s7", "s8", "s3"].map((id) => rep(id).status)).toEqual(["published", "submitted", "approved", "draft", "draft"]);
    for (const id of ["s1", "s2", "s7", "s8"]) expect(reportProblemsTkq(rep(id), d.paiTemplate)).toEqual([]);
    expect(reportProblemsTkq(rep("s3"), d.paiTemplate).length).toBeGreaterThan(0);
    expect(paiTotals(d.paiTemplate, rep("s3").pai).done).toBe(20);
    expect(rep("s9")).toBeUndefined();
  });
});