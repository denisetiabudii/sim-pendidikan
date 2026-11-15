import { describe, expect, it } from "vitest";
import { demoData } from "../demo";
import { finalScore } from "../grades";
import { surahByNo, validateAyatRange } from "../quran";

const d = demoData("2026-11-15");

describe("data demo", () => {
  it("semua referensi menunjuk data yang ada", () => {
    for (const a of d.attendance) expect(d.students[a.studentId]?.groupId).toBe(a.groupId);
    for (const n of d.notes) {
      expect(d.students[n.studentId]).toBeDefined();
      expect(d.users[n.authorId]).toBeDefined();
    }
    for (const i of d.incidents) {
      expect(d.students[i.studentId]).toBeDefined();
      expect(d.users[i.authorId]).toBeDefined();
    }
    for (const r of d.recitations) {
      expect(d.students[r.studentId]).toBeDefined();
      expect(d.users[r.authorId]).toBeDefined();
    }
  });
  it("rapor yang sudah diajukan atau lebih punya nilai lengkap", () => {
    for (const [id, r] of Object.entries(d.reports)) {
      const unit = d.groups[d.students[id].groupId].unit;
      expect(finalScore(d.components[unit], d.scores[id])).not.toBeNull();
      expect(r.status).not.toBe("draft");
    }
  });
  it("setoran hafalan memakai rentang ayat yang valid", () => {
    for (const r of d.recitations) {
      expect(validateAyatRange(r.surahNo, r.from, r.to)).toBeNull();
      expect(r.surah).toBe(surahByNo(r.surahNo)?.name);
    }
  });
});