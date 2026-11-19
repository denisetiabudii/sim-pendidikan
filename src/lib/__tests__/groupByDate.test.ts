import { describe, expect, it } from "vitest";
import { dayKey, dayLabel, groupByDay } from "../groupByDate";

describe("pengelompokan per hari", () => {
  it("dayKey memakai zona Asia/Jakarta, tanggal polos apa adanya", () => {
    expect(dayKey("2026-11-15")).toBe("2026-11-15");
    expect(dayKey("2026-11-15T10:00:00.000Z")).toBe("2026-11-15");
    expect(dayKey("2026-11-15T20:00:00.000Z")).toBe("2026-11-16"); // lewat tengah malam WIB
  });
  it("label: hari ini, kemarin (termasuk lintas bulan), dan tanggal panjang", () => {
    expect(dayLabel("2026-11-16", "2026-11-16")).toBe("Hari ini");
    expect(dayLabel("2026-11-15", "2026-11-16")).toBe("Kemarin");
    expect(dayLabel("2026-02-28", "2026-03-01")).toBe("Kemarin");
    expect(dayLabel("2026-11-09", "2026-11-16")).toContain("9 November 2026");
  });
  it("groupByDay mengurutkan hari terbaru dulu dan menjaga urutan di dalam hari", () => {
    const items = [
      { id: 1, at: "2026-11-14" },
      { id: 2, at: "2026-11-16T03:00:00.000Z" },
      { id: 3, at: "2026-11-16T01:00:00.000Z" },
    ];
    const g = groupByDay(items, (x) => x.at, "2026-11-16");
    expect(g.map((x) => x.key)).toEqual(["2026-11-16", "2026-11-14"]);
    expect(g[0].items.map((x) => x.id)).toEqual([2, 3]);
    expect(g[0].label).toBe("Hari ini");
  });
});