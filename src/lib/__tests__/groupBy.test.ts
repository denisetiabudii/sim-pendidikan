import { describe, expect, it } from "vitest";
import { groupIds, sortGroups } from "../groupBy";
import { seed } from "../seed";

describe("groupBy", () => {
  const d = seed();
  it("mengelompokkan peserta per kelompok dan mengurutkan nama kelompok", () => {
    const m = groupIds(d, ["s1", "s2", "s3", "s4"]);
    expect(m.get("TKA")).toEqual(["s1", "s2"]);
    expect(m.get("TKB")).toEqual(["s3"]);
    expect(m.get("H1")).toEqual(["s4"]);
    expect(sortGroups(d, m.keys())).toEqual(["H1", "TKA", "TKB"]); // Halaqoh 1, Kelas A, Kelas B
  });
});