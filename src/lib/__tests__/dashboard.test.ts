import { describe, expect, it } from "vitest";
import { attendanceRate, incompleteScores, lastDays, missingAttendance, reportBuckets } from "../dashboard";
import { demoData } from "../demo";
import { seed } from "../seed";
import { weightsLocked } from "../grades";

describe("dashboard", () => {
  it("lastDays berurutan dan melewati batas bulan", () => {
    expect(lastDays("2026-11-15", 3)).toEqual(["2026-11-13", "2026-11-14", "2026-11-15"]);
    expect(lastDays("2026-03-01", 2)).toEqual(["2026-02-28", "2026-03-01"]);
    expect(lastDays("", 3)).toEqual([]);
  });
  it("attendanceRate menghitung Hadir dan Terlambat, null bila kosong", () => {
    const d = seed();
    expect(attendanceRate(d, ["s1"], ["2026-11-15"])).toBeNull();
    d.attendance.push(
      { studentId: "s1", groupId: "TKA", date: "2026-11-15", status: "Hadir" },
      { studentId: "s2", groupId: "TKA", date: "2026-11-15", status: "Alpa" }
    );
    expect(attendanceRate(d, ["s1", "s2"], ["2026-11-15"])).toBe(50);
  });
  it("missingAttendance mengikuti cakupan peran", () => {
    const d = demoData("2026-11-15");
    expect(missingAttendance(d, d.users.u2, "2026-11-15")).toEqual([{ groupId: "TKA", missing: 4, total: 4 }]);
    expect(missingAttendance(d, d.users.u8, "2026-11-15")).toEqual([]); // TKB sudah terisi
  });
  it("reportBuckets dan nilai belum lengkap pada data demo", () => {
    const d = demoData("2026-11-15");
    const ids = Object.keys(d.students);
    expect(reportBuckets(d, ids)).toEqual({ draft: 7, readyToSubmit: 5, submitted: 3, approved: 1, published: 1 });
    expect(incompleteScores(d, ids)).toBe(2);
  });

  describe("penguncian bobot pada data demo", () => {
  it("TKQ terkunci, RTQ belum", () => {
    const d = demoData("2026-11-15");
    expect(weightsLocked(d, "TKQ")).toBe(true);
    expect(weightsLocked(d, "RTQ")).toBe(false);
  });
});
});