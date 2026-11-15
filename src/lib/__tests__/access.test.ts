import { describe, expect, it } from "vitest";
import { canEditGroup, canSeeStudent, canViewIncident, myStudentIds } from "../access";
import { seed } from "../seed";
import type { Incident } from "../types";

const data = seed();
const u = (id: string) => data.users[id];
const ids = (id: string) => myStudentIds(data, u(id)).sort();

describe("cakupan peserta per peran (tidak boleh bocor)", () => {
  it("guru hanya melihat kelompok penugasannya", () => {
    expect(ids("u3")).toEqual(["s1", "s2"]);
    expect(ids("u4")).toEqual(["s4", "s5"]);
  });
  it("kepala unit hanya melihat unitnya", () => {
    expect(ids("u2")).toEqual(["s1", "s2", "s3"]);
    expect(ids("u5")).toEqual(["s4", "s5", "s6"]);
  });
  it("direktur melihat semua", () => {
    expect(ids("u1")).toHaveLength(6);
  });
  it("wali hanya melihat anaknya, lintas unit", () => {
    expect(ids("u6")).toEqual(["s1", "s4"]);
  });
  it("tidak ada lintas unit untuk kepala dan guru", () => {
    expect(canSeeStudent(data, u("u2"), "s4")).toBe(false);
    expect(canSeeStudent(data, u("u5"), "s1")).toBe(false);
    expect(canSeeStudent(data, u("u3"), "s3")).toBe(false);
    expect(canSeeStudent(data, u("u4"), "s6")).toBe(false);
  });
});

describe("hak ubah kelompok", () => {
  it("guru dan kepala boleh, direktur dan wali tidak", () => {
    expect(canEditGroup(data, u("u3"), "TKA")).toBe(true);
    expect(canEditGroup(data, u("u3"), "TKB")).toBe(false);
    expect(canEditGroup(data, u("u2"), "TKB")).toBe(true);
    expect(canEditGroup(data, u("u2"), "H1")).toBe(false);
    expect(canEditGroup(data, u("u1"), "TKA")).toBe(false);
    expect(canEditGroup(data, u("u6"), "TKA")).toBe(false);
  });
});

describe("akses buku kejadian", () => {
  const base: Incident = {
    id: "i1",
    studentId: "s1",
    authorId: "u3",
    category: "x",
    level: "biasa",
    occurredAt: "",
    location: "",
    chronology: "k",
    initialAction: "",
    status: "Baru",
    followUp: "",
    createdAt: "",
  };
  const sensitive = { ...base, level: "sensitif" as const };

  it("catatan biasa: guru penugasan, kepala unit, direktur", () => {
    expect(canViewIncident(data, u("u3"), base)).toBe(true);
    expect(canViewIncident(data, u("u2"), base)).toBe(true);
    expect(canViewIncident(data, u("u1"), base)).toBe(true);
    expect(canViewIncident(data, u("u4"), base)).toBe(false);
    expect(canViewIncident(data, u("u5"), base)).toBe(false);
  });
  it("catatan sensitif: hanya kepala unit dan direktur", () => {
    expect(canViewIncident(data, u("u3"), sensitive)).toBe(false);
    expect(canViewIncident(data, u("u2"), sensitive)).toBe(true);
    expect(canViewIncident(data, u("u1"), sensitive)).toBe(true);
    expect(canViewIncident(data, u("u5"), sensitive)).toBe(false);
  });
  it("wali tidak pernah melihat buku kejadian", () => {
    expect(canViewIncident(data, u("u6"), base)).toBe(false);
    expect(canViewIncident(data, u("u6"), sensitive)).toBe(false);
  });
});