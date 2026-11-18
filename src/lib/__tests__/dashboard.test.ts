import { describe, expect, it } from "vitest";
import {
  attendanceRate,
  incompleteScores,
  lastDays,
  missingAttendance,
  progressBars,
  reportBuckets,
  reportStatusRows,
  reportTasks,
} from "../dashboard";
import { myStudentIds } from "../access";
import { demoData } from "../demo";
import { seed } from "../seed";
import { weightsLocked } from "../grades";

describe("dashboard", () => {
  it("lastDays berurutan dan melewati batas bulan", () => {
    expect(lastDays("2026-11-15", 3)).toEqual([
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
    expect(lastDays("2026-03-01", 2)).toEqual(["2026-02-28", "2026-03-01"]);
    expect(lastDays("", 3)).toEqual([]);
  });
  it("attendanceRate menghitung Hadir dan Terlambat, null bila kosong", () => {
    const d = seed();
    expect(attendanceRate(d, ["s1"], ["2026-11-15"])).toBeNull();
    d.attendance.push(
      { studentId: "s1", groupId: "TKA", date: "2026-11-15", status: "Hadir" },
      { studentId: "s2", groupId: "TKA", date: "2026-11-15", status: "Alpa" },
    );
    expect(attendanceRate(d, ["s1", "s2"], ["2026-11-15"])).toBe(50);
  });
  it("missingAttendance mengikuti cakupan peran", () => {
    const d = demoData("2026-11-15");
    expect(missingAttendance(d, d.users.u2, "2026-11-15")).toEqual([
      { groupId: "TKA", missing: 4, total: 4 },
    ]);
    expect(missingAttendance(d, d.users.u8, "2026-11-15")).toEqual([]); // TKB sudah terisi
  });
  it("reportBuckets dan nilai belum lengkap pada data demo", () => {
    const d = demoData("2026-11-15");
    const ids = Object.keys(d.students);
    expect(reportBuckets(d, ids)).toEqual({
      draft: 7,
      readyToSubmit: 5,
      submitted: 3,
      approved: 1,
      published: 1,
    });
    expect(incompleteScores(d, ids)).toBe(2);
  });

  describe("penguncian bobot pada data demo", () => {
    it("TKQ terkunci, RTQ belum", () => {
      const d = demoData("2026-11-15");
      expect(weightsLocked(d, "TKQ")).toBe(true);
      expect(weightsLocked(d, "RTQ")).toBe(false);
    });
  });
  describe("dashboard per unit dan tugas rapor", () => {
    const d = demoData("2026-11-15");
    const scope = (id: string) => myStudentIds(d, d.users[id]);

    it("PIC RTQ melihat rapor Kuartal 1 menunggu persetujuan walau kuartal berjalan adalah 2", () => {
      expect(reportTasks(d, d.users.u5, scope("u5"))).toEqual([
        {
          unit: "RTQ",
          quarter: 1,
          kind: "review",
          count: 1,
          href: "/rapor-kuartal",
        },
      ]);
    });
    it("PIC TKQ: satu menunggu persetujuan dan satu siap dipublikasikan", () => {
      expect(reportTasks(d, d.users.u2, scope("u2"))).toEqual([
        { unit: "TKQ", kind: "review", count: 1, href: "/rapor" },
        { unit: "TKQ", kind: "publish", count: 1, href: "/rapor" },
      ]);
    });
    it("guru hanya melihat rapor siap diajukan di kelompoknya, direktur dan wali tanpa tugas", () => {
      expect(reportTasks(d, d.users.u3, scope("u3"))).toEqual([
        { unit: "TKQ", kind: "ready", count: 2, href: "/rapor" },
      ]);
      expect(reportTasks(d, d.users.u4, scope("u4"))).toEqual([]);
      expect(reportTasks(d, d.users.u1, scope("u1"))).toEqual([]);
      expect(reportTasks(d, d.users.u6, scope("u6"))).toEqual([]);
    });
    it("status rapor per unit, RTQ per kuartal yang sudah berjalan", () => {
      const tkq = scope("u2");
      expect(reportStatusRows(d, tkq, "TKQ", "2026-11-15")).toEqual([
        {
          label: "Rapor",
          counts: {
            belum: 0,
            draft: 4,
            submitted: 1,
            approved: 1,
            published: 1,
          },
        },
      ]);
      expect(reportStatusRows(d, scope("u5"), "RTQ", "2026-11-15")).toEqual([
        {
          label: "Kuartal 1",
          counts: {
            belum: 4,
            draft: 0,
            submitted: 1,
            approved: 0,
            published: 0,
          },
        },
        {
          label: "Kuartal 2",
          counts: {
            belum: 5,
            draft: 0,
            submitted: 0,
            approved: 0,
            published: 0,
          },
        },
      ]);
      expect(
        reportStatusRows(d, scope("u5"), "RTQ", "2026-08-01").map(
          (r) => r.label,
        ),
      ).toEqual(["Kuartal 1"]);
    });
    it("bar capaian memakai data sesuai unit", () => {
      const days = lastDays("2026-11-15", 7);
      const rtq = progressBars(d, scope("u5"), "RTQ", days);
      expect(rtq.map((b) => b.label)).toEqual([
        "Kehadiran 7 hari terakhir",
        "Santri yang menyetor 7 hari terakhir",
      ]);
      expect(rtq[1].pct).toBe(80); // 4 dari 5 santri menyetor dalam 7 hari
      expect(progressBars(d, scope("u2"), "TKQ", days)[1]).toEqual({
        label: "Nilai sudah lengkap",
        pct: 100,
      });
    });
  });
});
