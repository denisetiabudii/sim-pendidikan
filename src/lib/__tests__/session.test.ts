import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../store";
import { seed } from "../seed";
import { canOpen, labelFor, navFor, NAV } from "../nav";

const st = () => useStore.getState();
beforeEach(() => useStore.setState({ data: seed(), currentUserId: "u3", session: null }));

describe("masuk per peran dan unit", () => {
  it("password, unit, dan peran harus cocok, username tidak peka huruf besar", () => {
    expect(st().signIn("aisyah", "salah", "TKQ:guru")).toMatchObject({ ok: false });
    expect(st().signIn("aisyah", "demo", "RTQ:guru")).toMatchObject({ ok: false }); // guru TKQ lewat pintu RTQ
    expect(st().signIn("aisyah", "demo", "TKQ:pic")).toMatchObject({ ok: false }); // guru lewat pintu PIC
    expect(st().session).toBeNull();
    expect(st().signIn("AISYAH", "demo", "TKQ:guru").ok).toBe(true);
    expect(st().session).toEqual({ unit: "TKQ", groupIds: [] });
    expect(st().currentUserId).toBe("u3");
  });
  it("PIC dan direktur masuk lewat pintu masing-masing, wali tidak bisa masuk", () => {
    expect(st().signIn("pic.tkq", "demo", "RTQ:pic")).toMatchObject({ ok: false });
    expect(st().signIn("pic.tkq", "demo", "TKQ:guru")).toMatchObject({ ok: false });
    expect(st().signIn("pic.tkq", "demo", "TKQ:pic").ok).toBe(true);
    for (const e of ["TKQ:guru", "TKQ:pic", "RTQ:guru", "RTQ:pic", "direktur"] as const)
      expect(st().signIn("budi", "demo", e)).toMatchObject({ ok: false });
    expect(st().signIn("direktur", "demo", "direktur").ok).toBe(true);
    expect(st().session?.unit).toBeUndefined();
    st().signOut();
    expect(st().session).toBeNull();
  });
  it("guru hanya bisa memilih kelas yang ditugaskan", () => {
    st().signIn("aisyah", "demo", "TKQ:guru");
    expect(st().chooseGroups([])).toMatchObject({ ok: false });
    expect(st().chooseGroups(["TKB"])).toMatchObject({ ok: false });
    expect(st().chooseGroups(["TKA"]).ok).toBe(true);
    expect(st().session?.groupIds).toEqual(["TKA"]);
    st().resetGroups();
    expect(st().session?.groupIds).toEqual([]);
  });
  it("login tercatat di audit tanpa menyimpan password", () => {
    st().signIn("aisyah", "demo", "TKQ:guru");
    expect(st().data.audit[0]).toMatchObject({ action: "Masuk", actor: "Ustadzah Aisyah (guru TKQ)" });
    expect(JSON.stringify(st().data.audit)).not.toContain("demo");
  });
});

describe("menu per unit", () => {
  const labels = (role: "pendidik" | "kepala", unit: "TKQ" | "RTQ") =>
    navFor(role, unit).map((n) => labelFor(n, unit));

  it("TKQ dan RTQ mendapat menu yang berbeda", () => {
    expect(labels("pendidik", "TKQ")).toEqual(["Dashboard", "Absensi Siswa", "Komunikasi", "Kejadian Siswa", "Penilaian & Raport"]);
    expect(labels("pendidik", "RTQ")).toEqual(["Dashboard", "Absensi Santri", "Tahfidz & Murojaah", "Komunikasi", "Kejadian Santri", "Raport"]);
  });
  it("halaman unit lain tidak bisa dibuka", () => {
    expect(canOpen("pendidik", "/setoran", "TKQ")).toBe(false);
    expect(canOpen("pendidik", "/rapor-tkq", "RTQ")).toBe(false);
    expect(canOpen("pendidik", "/rapor-tkq", "TKQ")).toBe(true);
    expect(canOpen("pendidik", "/rapor-kuartal", "RTQ")).toBe(true);
    expect(canOpen("pendidik", "/rapor", "TKQ")).toBe(false); // rapor TKQ lama dipensiunkan
    expect(canOpen("pendidik", "/audit", "TKQ")).toBe(false);
  });
  it("direktur melihat raport kedua unit", () => {
    expect(navFor("direktur").some((n) => n.href === "/rapor-tkq")).toBe(true);
    expect(navFor("direktur").some((n) => n.href === "/rapor-kuartal")).toBe(true);
    expect(NAV.length).toBeGreaterThan(8);
  });
});