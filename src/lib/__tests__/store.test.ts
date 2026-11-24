import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../store";
import { seed } from "../seed";
import { demoData } from "../demo";
import { emptyBio, ratingsFor } from "../tkq";

const st = () => useStore.getState();
const fresh = (userId: string) =>
  useStore.setState({ data: seed(), currentUserId: userId });
const login = (userId: string) => st().login(userId);
const fillScores = (studentId: string) => {
  for (const [c, v] of [
    ["Tahfidz", 80],
    ["Tahsin", 90],
    ["Calistung", 70],
    ["Adab & kemandirian", 60],
  ] as const)
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
    expect(
      st().recordAttendance("s1", "2026-11-15", "Sakit", "Surat dokter").ok,
    ).toBe(true);
    expect(st().data.attendance).toHaveLength(1); // BR-04: tetap satu catatan
    expect(st().data.attendance[0].status).toBe("Sakit");
  });
  it("ditolak di luar penugasan, dan untuk wali serta direktur", () => {
    expect(st().recordAttendance("s3", "2026-11-15", "Hadir")).toMatchObject(
      denied,
    );
    login("u4");
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir")).toMatchObject(
      denied,
    );
    login("u6");
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir")).toMatchObject(
      denied,
    );
    login("u1");
    expect(st().recordAttendance("s1", "2026-11-15", "Hadir")).toMatchObject(
      denied,
    );
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
    expect(st().setScore("s1", "Tahfidz", 99)).toMatchObject({
      error: expect.stringContaining("terkunci"),
    });

    login("u2");
    expect(st().setWeight("TKQ", "Tahfidz", 30)).toMatchObject({
      error: expect.stringContaining("terkunci"),
    });
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
    expect(
      st().data.audit.some((a) => a.action === "Buka catatan sensitif"),
    ).toBe(true);
  });
  it("isi kronologi tidak pernah masuk audit", () => {
    st().addIncident({
      ...input("Kesehatan ringan"),
      chronology: "RAHASIA-123",
    });
    expect(JSON.stringify(st().data.audit)).not.toContain("RAHASIA-123");
  });
  it("wali tidak bisa membuat catatan", () => {
    login("u6");
    expect(
      st().addIncident({ ...input("Kesehatan ringan"), studentId: "s1" }),
    ).toMatchObject(denied);
  });
});

describe("impor peserta", () => {
  const imp = (name: string, group: string) =>
    st().importStudents([
      ["nama", "kelompok"],
      [name, group],
    ]);

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
    expect(st().undoImport(batch.id)).toMatchObject({
      ok: false,
      error: expect.stringContaining("sudah punya data"),
    });
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
    expect(st().data.recitations[0]).toMatchObject({
      surahNo: 1,
      surah: "Al-Fatihah",
    });
    expect(st().addRecitation(rec("s4", { from: 8, to: 3 }))).toMatchObject({
      ok: false,
    });
    expect(st().addRecitation(rec("s4", { to: 8 }))).toMatchObject({
      ok: false,
      error: expect.stringContaining("hanya memiliki 7 ayat"),
    });
    expect(st().addRecitation(rec("s4", { surahNo: 2, to: 286 })).ok).toBe(
      true,
    );
    expect(st().addRecitation(rec("s4", { surahNo: 0 }))).toMatchObject({
      ok: false,
    });
    expect(st().addRecitation(rec("s6"))).toMatchObject(denied); // halaqoh lain
    expect(st().data.recitations).toHaveLength(2);
  });
  it("setoran baru yang tumpang tindih perlu konfirmasi, murojaah tidak", () => {
    login("u4");
    expect(
      st().addRecitation(rec("s4", { surahNo: 2, from: 1, to: 10 })).ok,
    ).toBe(true);
    const dup = st().addRecitation(rec("s4", { surahNo: 2, from: 5, to: 15 }));
    expect(dup).toMatchObject({ ok: false, code: "overlap" });
    expect(st().data.recitations).toHaveLength(1);
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 2, from: 5, to: 15, confirmOverlap: true }),
      ).ok,
    ).toBe(true);
    expect(st().data.audit[0].detail).toContain("tumpang tindih dikonfirmasi");
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 2, from: 1, to: 10, kind: "Murojaah" }),
      ).ok,
    ).toBe(true);
  });
  it("surah manual diterima dengan validasi dasar", () => {
    login("u4");
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 0, surahName: "سورة خاصة", from: 1, to: 10 }),
      ).ok,
    ).toBe(true);
    expect(st().data.recitations[0]).toMatchObject({
      surahNo: 0,
      surah: "سورة خاصة",
    });
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 0, surahName: "  ", from: 1, to: 10 }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 0, surahName: "X", from: 5, to: 3 }),
      ),
    ).toMatchObject({ ok: false });
    expect(st().data.recitations).toHaveLength(1);
  });
  it("nama manual yang cocok dihitung sebagai surah biasa", () => {
    login("u4");
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 0, surahName: "الإخلاص", from: 1, to: 4 }),
      ).ok,
    ).toBe(true);
    expect(st().data.recitations[0]).toMatchObject({
      surahNo: 112,
      surah: "Al-Ikhlas",
    });
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 0, surahName: "الإخلاص", from: 1, to: 5 }),
      ),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("hanya memiliki 4 ayat"),
    });
    // mengulang ayat yang sama sebagai setoran baru memicu peringatan tumpang tindih
    expect(
      st().addRecitation(
        rec("s4", { surahNo: 0, surahName: "اخلاص", from: 1, to: 4 }),
      ),
    ).toMatchObject({
      ok: false,
      code: "overlap",
    });
  });
  describe("rapor kuartal RTQ", () => {
    const a = () => ({ predikat: "A" as const, text: "Baik" });
    const content = (over: Record<string, unknown> = {}) => ({
      akhlak: { tuturKata: a(), sikap: a() },
      tahsin: { kelancaran: a(), makhraj: a(), tajwid: a() },
      tahfidz: [
        { surahNo: 104, name: "", from: 1, to: 9, harian: 80, evaluasi: 95 },
      ],
      catatan: "Semangat",
      ...over,
    });

    it("hanya murabbi kelompoknya yang boleh mengisi, dan hanya untuk RTQ", () => {
      login("u3");
      expect(st().saveRtqDraft("s1", 1, content())).toMatchObject({
        ok: false,
      }); // peserta TKQ
      login("u4");
      expect(st().saveRtqDraft("s6", 1, content())).toMatchObject(denied); // halaqoh lain
      expect(st().saveRtqDraft("s4", 1, content()).ok).toBe(true);
      login("u5");
      expect(st().saveRtqDraft("s4", 1, content())).toMatchObject(denied); // kepala tidak mengisi
    });
    it("validasi ayat dan nilai ditolak di store", () => {
      login("u4");
      expect(
        st().saveRtqDraft(
          "s4",
          1,
          content({
            tahfidz: [
              {
                surahNo: 1,
                name: "",
                from: 1,
                to: 8,
                harian: 80,
                evaluasi: 80,
              },
            ],
          }),
        ),
      ).toMatchObject({ ok: false });
      expect(
        st().saveRtqDraft(
          "s4",
          1,
          content({
            tahfidz: [
              {
                surahNo: 1,
                name: "",
                from: 1,
                to: 7,
                harian: 120,
                evaluasi: 80,
              },
            ],
          }),
        ),
      ).toMatchObject({ ok: false });
    });
    it("tidak bisa diajukan bila belum lengkap, lalu alur lengkap dengan penguncian", () => {
      login("u4");
      st().saveRtqDraft(
        "s4",
        1,
        content({
          catatan: "",
          tahfidz: [
            {
              surahNo: 104,
              name: "",
              from: 1,
              to: 9,
              harian: 80,
              evaluasi: null,
            },
          ],
        }),
      );
      expect(st().changeRtqReport("s4", 1, "submit")).toMatchObject({
        ok: false,
      });
      st().saveRtqDraft("s4", 1, content());

      login("u3");
      login("u4");
      st().recordAttendance("s4", "2026-09-10", "Sakit");
      expect(st().changeRtqReport("s4", 1, "submit").ok).toBe(true);
      expect(st().data.rtqReports["s4|2026/2027|1"].absence).toEqual({
        sakit: 1,
        izin: 0,
        tanpa: 0,
      });

      login("u2");
      expect(st().changeRtqReport("s4", 1, "approve")).toMatchObject(denied); // PIC TKQ
      login("u5");
      expect(st().changeRtqReport("s4", 1, "approve").ok).toBe(true);
      login("u4");
      expect(st().saveRtqDraft("s4", 1, content())).toMatchObject({
        error: expect.stringContaining("terkunci"),
      });
      login("u5");
      expect(st().changeRtqReport("s4", 1, "publish").ok).toBe(true);
      expect(st().changeRtqReport("s4", 1, "revise")).toMatchObject({
        ok: false,
      });
      expect(st().changeRtqReport("s4", 1, "revise", "Salah input").ok).toBe(
        true,
      );
      expect(st().data.rtqReports["s4|2026/2027|1"]).toMatchObject({
        status: "draft",
        version: 2,
      });
    });
  });
  describe("identitas lembaga dan kuartal", () => {
    it("hanya direktur yang boleh mengubah identitas", () => {
      login("u2");
      expect(st().saveInstitution({ name: "X" })).toMatchObject(denied);
      login("u1");
      expect(st().saveInstitution({ name: "Rumah Tahfidz Baru" }).ok).toBe(
        true,
      );
      expect(st().data.institution.name).toBe("Rumah Tahfidz Baru");
      expect(st().saveInstitution({ name: "  " })).toMatchObject({ ok: false });
    });
    it("logo harus PNG, JPG, atau WebP dan tidak terlalu besar, dan datanya tidak masuk audit", () => {
      login("u1");
      expect(
        st().saveInstitution({ logoDataUrl: "data:image/svg+xml;base64,AAAA" }),
      ).toMatchObject({ ok: false });
      expect(
        st().saveInstitution({
          logoDataUrl: "data:image/png;base64," + "A".repeat(500_000),
        }),
      ).toMatchObject({ ok: false });
      expect(
        st().saveInstitution({
          logoDataUrl: "data:image/png;base64,iVBORw0KGgo=",
        }).ok,
      ).toBe(true);
      expect(st().data.institution.logoDataUrl).toBeDefined();
      expect(st().saveInstitution({ logoDataUrl: "" }).ok).toBe(true);
      expect(st().data.institution.logoDataUrl).toBeUndefined();
      expect(JSON.stringify(st().data.audit)).not.toContain("iVBOR");
    });
    it("validasi tahun ajaran dan tanggal kuartal", () => {
      login("u1");
      const a = st().data.academic;
      const q = a.quarters.map((x) => ({ ...x }));
      expect(st().saveAcademic("2026/2028", q)).toMatchObject({ ok: false });
      expect(st().saveAcademic(a.year, [q[0], q[1]])).toMatchObject({
        ok: false,
      });
      expect(
        st().saveAcademic(a.year, [{ ...q[0], end: "2026-06-01" }, q[1], q[2]]),
      ).toMatchObject({ ok: false });
      expect(
        st().saveAcademic(a.year, [
          q[0],
          { ...q[1], start: "2026-10-01" },
          q[2],
        ]),
      ).toMatchObject({ ok: false });
      expect(
        st().saveAcademic(a.year, [
          { ...q[0], start: "2026-13-45" },
          q[1],
          q[2],
        ]),
      ).toMatchObject({ ok: false });
      expect(
        st().saveAcademic(a.year, [{ ...q[0], end: "2026-10-30" }, q[1], q[2]])
          .ok,
      ).toBe(true);
      login("u5");
      expect(st().saveAcademic(a.year, q)).toMatchObject(denied);
    });
    it("tanggal kuartal terkunci bila sudah ada rapor yang diajukan, tanggal tanda tangan tidak", () => {
      useStore.setState({ data: demoData("2026-11-15"), currentUserId: "u1" });
      const a = st().data.academic;
      const q = a.quarters.map((x) => ({ ...x }));
      expect(
        st().saveAcademic(a.year, [{ ...q[0], end: "2026-10-30" }, q[1], q[2]]),
      ).toMatchObject({
        ok: false,
        error: expect.stringContaining("terkunci"),
      });
      expect(
        st().saveAcademic(a.year, [
          { ...q[0], signDate: "2026-11-05" },
          q[1],
          q[2],
        ]).ok,
      ).toBe(true);
      expect(st().saveAcademic("2027/2028", q)).toMatchObject({ ok: false });
    });
  });

  describe("rapor TKQ", () => {
  const txt = "Ananda berkembang baik.";
  const content = (over: Record<string, unknown> = {}) => ({
    usia: "5 – 6 Tahun",
    pai: ratingsFor(seed().paiTemplate, () => "BSH" as const),
    capaian: { agama: txt, jatiDiri: txt, literasi: txt },
    pertumbuhan: { bb: 18, tb: 110, lk: 50 },
    projek: {
      topik: "Aku Cinta Indonesia", fase: "Fondasi",
      dimensi: { iman: txt, kebinekaan: txt, gotong: txt, mandiri: txt, kreatif: txt, nalar: txt },
    },
    ...over,
  });

  it("hanya guru kelasnya yang boleh mengisi, dan hanya untuk peserta TKQ", () => {
    login("u3");
    expect(st().saveTkqDraft("s1", 1, content()).ok).toBe(true);
    expect(st().saveTkqDraft("s3", 1, content())).toMatchObject(denied); // kelas B
    login("u4");
    expect(st().saveTkqDraft("s1", 1, content())).toMatchObject(denied); // murabbi RTQ
    expect(st().saveTkqDraft("s4", 1, content())).toMatchObject({ ok: false }); // peserta RTQ
    login("u2");
    expect(st().saveTkqDraft("s1", 1, content())).toMatchObject(denied); // PIC tidak mengisi
  });
  it("penilaian dan pertumbuhan yang tidak valid ditolak di store", () => {
    login("u3");
    expect(st().saveTkqDraft("s1", 1, content({ pai: { "sI-1": "XX" } }))).toMatchObject({ ok: false });
    expect(st().saveTkqDraft("s1", 1, content({ pertumbuhan: { bb: 500, tb: null, lk: null } }))).toMatchObject({ ok: false });
  });
  it("alur lengkap: belum lengkap tidak bisa diajukan, lalu persetujuan, penguncian, dan revisi", () => {
    login("u3");
    expect(st().changeTkqReport("s1", 1, "submit")).toMatchObject({ error: "Rapor belum diisi" });
    st().saveTkqDraft("s1", 1, content({ capaian: { agama: "", jatiDiri: "", literasi: "" } }));
    expect(st().changeTkqReport("s1", 1, "submit")).toMatchObject({ ok: false });
    st().saveTkqDraft("s1", 1, content());
    st().recordAttendance("s1", "2026-09-10", "Sakit");
    expect(st().changeTkqReport("s1", 1, "submit").ok).toBe(true);
    expect(st().data.tkqReports["s1|2026/2027|1"].absence).toEqual({ sakit: 1, izin: 0, tanpa: 0 });

    login("u3");
    expect(st().changeTkqReport("s1", 1, "approve")).toMatchObject(denied); // guru
    login("u5");
    expect(st().changeTkqReport("s1", 1, "approve")).toMatchObject({ ok: false }); // PIC RTQ
    login("u2");
    expect(st().changeTkqReport("s1", 1, "publish")).toMatchObject(denied); // belum disetujui
    expect(st().changeTkqReport("s1", 1, "approve").ok).toBe(true);
    login("u3");
    expect(st().saveTkqDraft("s1", 1, content())).toMatchObject({ error: expect.stringContaining("terkunci") });
    login("u2");
    expect(st().changeTkqReport("s1", 1, "publish").ok).toBe(true);
    expect(st().changeTkqReport("s1", 1, "revise")).toMatchObject({ ok: false });
    expect(st().changeTkqReport("s1", 1, "revise", "Salah input").ok).toBe(true);
    expect(st().data.tkqReports["s1|2026/2027|1"]).toMatchObject({ status: "draft", version: 2 });
  });
  it("biodata: guru kelasnya dan PIC unit boleh, isi tidak masuk audit", () => {
    const bio = (over = {}) => ({ ...emptyBio(), father: "Ayah-RAHASIA", ...over });
    login("u3");
    expect(st().saveStudentBio("s1", bio()).ok).toBe(true);
    expect(st().data.students.s1.bio?.father).toBe("Ayah-RAHASIA");
    expect(st().saveStudentBio("s3", bio())).toMatchObject(denied); // kelas B
    expect(st().saveStudentBio("s1", bio({ phone: "08ab" }))).toMatchObject({ ok: false });
    login("u2");
    expect(st().saveStudentBio("s3", bio()).ok).toBe(true);
    login("u5");
    expect(st().saveStudentBio("s3", bio({ mother: "X" }))).toMatchObject(denied); // PIC RTQ
    expect(JSON.stringify(st().data.audit)).not.toContain("Ayah-RAHASIA");
    expect(st().data.audit.some((a) => a.action === "Ubah biodata" && a.detail === "1 kolom diubah")).toBe(true);
  });
});
});
