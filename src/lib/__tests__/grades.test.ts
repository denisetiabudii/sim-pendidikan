import { describe, expect, it } from "vitest";
import { finalScore, predicate, weightsValid } from "../grades";
import { seed } from "../seed";

const tkq = seed().components.TKQ;

describe("finalScore", () => {
  it("menghitung nilai berbobot", () => {
    const s = { Tahfidz: 80, Tahsin: 90, Calistung: 70, "Adab & kemandirian": 60 };
    expect(finalScore(tkq, s)).toBe(75);
  });

  it("null bila ada komponen yang belum diisi", () => {
    expect(finalScore(tkq, { Tahfidz: 80, Tahsin: 90, Calistung: 70 })).toBeNull();
  });

  it("null bila belum ada nilai sama sekali", () => {
    expect(finalScore(tkq, undefined)).toBeNull();
  });

  it("null bila total bobot bukan 100", () => {
    const bad = [{ name: "A", weight: 50 }];
    expect(weightsValid(bad)).toBe(false);
    expect(finalScore(bad, { A: 100 })).toBeNull();
  });

  it("nilai 0 dihitung sebagai nilai, bukan kosong", () => {
    const s = { Tahfidz: 0, Tahsin: 0, Calistung: 0, "Adab & kemandirian": 0 };
    expect(finalScore(tkq, s)).toBe(0);
  });
});

describe("predicate (ambang contoh)", () => {
  it("memetakan ambang dengan benar", () => {
    expect(predicate(null)).toBe("Belum lengkap");
    expect(predicate(90)).toBe("Mumtaz");
    expect(predicate(89.99)).toBe("Jayyid Jiddan");
    expect(predicate(80)).toBe("Jayyid Jiddan");
    expect(predicate(70)).toBe("Jayyid");
    expect(predicate(69)).toBe("Perlu pendampingan");
  });
});