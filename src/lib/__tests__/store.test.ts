import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../store";
import { seed } from "../seed";

const st = () => useStore.getState();
const fresh = (userId: string) => useStore.setState({ data: seed(), currentUserId: userId });
const login = (userId: string) => st().login(userId);
const fillScores = (studentId: string) => {
  for (const [c, v] of [["Tahfidz", 80], ["Tahsin", 90], ["Calistung", 70], ["Adab & kemandirian", 60]] as const)
    expect(st().setScore(studentId, c, v).ok).toBe(true);
};
const denied = { ok: false, error: expect.stringContaining("Ditolak") };

beforeEach(() => fresh("u3"));

describe("absensi", () => {
  it("guru mengisi kelompoknya, koreksi wajib alasan", () => {
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir").ok).toBe(true);
    expect(st().recordAttendance("s1", "2026-11-15", "Sakit")).toMatchObject({
      ok: false,
      error: expect.stringContaining("alasan"),
    });
    expect(st().recordAttendance("s1", "2026-11-15", "Sakit", "Surat dokter").ok).toBe(true);
    expect(st().data.attendance).toHaveLength(1); // BR-04: tetap satu catatan
    expect(st().data.attendance[0].status).toBe("Sakit");
  });
  it("ditolak di luar penugasan, dan untuk wali serta direktur", () => {
    expect(st().recordAttendance("s3", "2026-11-15", "Hadir")).toMatchObject(denied);
    login("u4");
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir")).toMatchObject(denied);
    login("u6");
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir")).toMatchObject(denied);
    login("u1");
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir")).toMatchObject(denied);
  });
});

describe("nilai dan rapor", () => {
  it("kepala tidak bisa mengisi nilai, nilai di luar 0-100 ditolak", () => {
    expect(st().setScore("s1", "Tahfidz", 150)).toMatchObject({ ok: false });
    login("u2");
    expect(st().setScore("s1", "Tahfidz", 80)).toMatchObject(denied);
  });
  it("alur lengkap, penguncian nilai, dan penguncian bobot", () => {
    expect(st().changeReport("s1", "submit")).toMatchObject({ ok: false }); // nilai belum lengkap
    fillScores("s1");
    expect(st().changeReport("s1", "submit").ok).toBe(true);

    login("u3");
    expect(st().changeReport("s1", "approve")).toMatchObject(denied); // guru tak boleh menyetujui
    login("u5");
    expect(st().changeReport("s1", "approve")).toMatchObject(denied); // kepala unit lain
    login("u2");
    expect(st().changeReport("s1", "publish")).toMatchObject(denied); // belum disetujui
    expect(st().changeReport("s1", "approve").ok).toBe(true);

    login("u3");
    expect(st().setScore("s1", "Tahfidz", 99)).toMatchObject({ error: expect.stringContaining("terkunci") });

    login("u2");
    expect(st().setWeight("TKQ", "Tahfidz", 30)).toMatchObject({ error: expect.stringContaining("terkunci") });
    expect(st().changeReport("s1", "publish").ok).toBe(true);
  });
  it("revisi wajib alasan dan menaikkan versi", () => {
    fillScores("s1");
    st().changeReport("s1", "submit");
    login("u2");
    st().changeReport("s1", "approve");
    st().changeReport("s1", "publish");
    expect(st().changeReport("s1", "revise")).toMatchObject({ ok: false });
    expect(st().changeReport("s1", "revise", "Salah input").ok).toBe(true);
    expect(st().data.reports.s1).toMatchObject({ status: "draft", version: 2 });
  });
  it("wali tidak bisa mengubah status rapor", () => {
    login("u6");
    expect(st().changeReport("s1", "submit")).toMatchObject(denied);
  });
});

describe("buku kejadian", () => {
  const input = (category: string) => ({
    studentId: "s2",
    category,
    occurredAt: "",
    location: "",
    chronology: "Kronologi",
    initialAction: "",
  });
  it("catatan sensitif tersembunyi dari pembuatnya, terbuka untuk kepala dan tercatat di audit", () => {
    expect(st().addIncident(input("Perlindungan anak")).ok).toBe(true);
    const id = st().data.incidents[0].id;
    expect(st().data.incidents[0].level).toBe("sensitif");

    expect(st().openIncident(id)).toMatchObject(denied);
    login("u5");
    expect(st().openIncident(id)).toMatchObject(denied);
    login("u6");
    expect(st().openIncident(id)).toMatchObject(denied);
    login("u2");
    expect(st().openIncident(id).ok).toBe(true);
    expect(st().data.audit.some((a) => a.action === "Buka catatan sensitif")).toBe(true);
  });
  it("isi kronologi tidak pernah masuk audit", () => {
    st().addIncident({ ...input("Kesehatan ringan"), chronology: "RAHASIA-123" });
    expect(JSON.stringify(st().data.audit)).not.toContain("RAHASIA-123");
  });
  it("wali tidak bisa membuat catatan", () => {
    login("u6");
    expect(st().addIncident({ ...input("Kesehatan ringan"), studentId: "s1" })).toMatchObject(denied);
  });
});

describe("impor peserta", () => {
  const imp = (name: string, group: string) => st().importStudents([["nama", "kelompok"], [name, group]]);

  it("kepala unit tidak bisa mengimpor ke unit lain, guru tidak bisa mengimpor", () => {
    login("u2");
    expect(imp("Budi", "Halaqoh 1")).toMatchObject({ ok: false });
    login("u3");
    expect(imp("Budi", "Kelas A")).toMatchObject(denied);
  });
  it("membatalkan impor di tengah tanpa menyentuh yang lain", () => {
    login("u2");
    imp("Amina", "Kelas A");
    imp("Yusuf", "Kelas B");
    imp("Rina", "Kelas A");
    const middle = st().data.imports[1].id; // terbaru di indeks 0
    expect(st().undoImport(middle).ok).toBe(true);

    const names = Object.values(st().data.students).map((s) => s.name);
    expect(names).toContain("Amina");
    expect(names).toContain("Rina");
    expect(names).not.toContain("Yusuf");
    expect(st().data.imports).toHaveLength(2);
  });
  it("impor yang pesertanya sudah dipakai tidak bisa dibatalkan", () => {
    login("u2");
    imp("Amina", "Kelas A");
    const batch = st().data.imports[0];
    const sid = batch.studentIds[0];
    login("u3");
    st().recordAttendance(sid, "2026-11-15", "Hadir");
    login("u2");
    expect(st().undoImport(batch.id)).toMatchObject({ ok: false, error: expect.stringContaining("sudah punya data") });
  });
  it("kepala unit lain tidak bisa membatalkan impor orang lain", () => {
    login("u2");
    imp("Amina", "Kelas A");
    const id = st().data.imports[0].id;
    login("u5");
    expect(st().undoImport(id)).toMatchObject(denied);
  });
});

describe("pengaturan dan penugasan", () => {
  it("bobot dan kelompok hanya untuk direktur atau kepala unit terkait", () => {
    expect(st().setWeight("TKQ", "Tahfidz", 30)).toMatchObject(denied); // guru
    login("u5");
    expect(st().setWeight("TKQ", "Tahfidz", 30)).toMatchObject(denied); // kepala unit lain
    expect(st().addGroup("Kelas Z", "TKQ")).toMatchObject(denied);
    login("u2");
    expect(st().setWeight("TKQ", "Tahfidz", 30).ok).toBe(true);
    expect(st().addGroup("Kelas C", "TKQ").ok).toBe(true);
    expect(st().addGroup("kelas c", "TKQ")).toMatchObject({ ok: false }); // nama kembar
  });
  it("pendidik tidak boleh ditugaskan lintas unit", () => {
    login("u2");
    expect(st().assignEducator("u4", "TKB")).toMatchObject({ ok: false }); // Hamzah bertugas di RTQ
    expect(st().assignEducator("u3", "TKB").ok).toBe(true);
  });
});

describe("setoran hafalan", () => {
  const rec = (studentId: string, over: Record<string, unknown> = {}) => ({
    studentId,
    date: "2026-11-15",
    kind: "Setoran baru" as const,
    surahNo: 1,
    from: 1,
    to: 7,
    quality: "Lancar" as const,
    ...over,
  });

  it("murabbi RTQ mencatat untuk kelompoknya dengan validasi rentang ayat", () => {
    login("u4");
    expect(st().addRecitation(rec("s4")).ok).toBe(true);
    expect(st().data.recitations[0]).toMatchObject({ surahNo: 1, surah: "Al-Fatihah" });
    expect(st().addRecitation(rec("s4", { from: 8, to: 3 }))).toMatchObject({ ok: false });
    expect(st().addRecitation(rec("s4", { to: 8 }))).toMatchObject({
      ok: false,
      error: expect.stringContaining("hanya memiliki 7 ayat"),
    });
    expect(st().addRecitation(rec("s4", { surahNo: 2, to: 286 })).ok).toBe(true);
    expect(st().addRecitation(rec("s4", { surahNo: 0 }))).toMatchObject({ ok: false });
    expect(st().addRecitation(rec("s6"))).toMatchObject(denied); // halaqoh lain
    expect(st().data.recitations).toHaveLength(2);
  });
    it("setoran baru yang tumpang tindih perlu konfirmasi, murojaah tidak", () => {
    login("u4");
    expect(st().addRecitation(rec("s4", { surahNo: 2, from: 1, to: 10 })).ok).toBe(true);
    const dup = st().addRecitation(rec("s4", { surahNo: 2, from: 5, to: 15 }));
    expect(dup).toMatchObject({ ok: false, code: "overlap" });
    expect(st().data.recitations).toHaveLength(1);
    expect(st().addRecitation(rec("s4", { surahNo: 2, from: 5, to: 15, confirmOverlap: true })).ok).toBe(true);
    expect(st().data.audit[0].detail).toContain("tumpang tindih dikonfirmasi");
    expect(st().addRecitation(rec("s4", { surahNo: 2, from: 1, to: 10, kind: "Murojaah" })).ok).toBe(true);
  });
});