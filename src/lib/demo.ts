import { seed } from "./seed";
import { surahByNo } from "./quran";
import type {
  AppData,
  AttendanceStatus,
  Recitation,
  RecitationKind,
  RecitationQuality,
} from "./types";
import { newRtqReport, rtqKey } from "./rtq";

const addDays = (iso: string, d: number) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};

const PAT: AttendanceStatus[] = [
  "Hadir",
  "Hadir",
  "Hadir",
  "Terlambat",
  "Hadir",
  "Izin",
  "Hadir",
  "Alpa",
  "Hadir",
  "Sakit",
];

// Data fiktif untuk presentasi. Semua nama dan catatan hanya contoh.
export function demoData(today: string): AppData {
  const d = seed();
  const now = `${today}T03:00:00.000Z`;

  d.users.u7 = {
    id: "u7",
    username: "salim",
    name: "Ustadz Salim (murabbi RTQ)",
    role: "pendidik",
    unit: "RTQ",
    groupIds: ["H2"],
  };
  d.users.u8 = {
    id: "u8",
    username: "dina",
    name: "Ustadzah Dina (guru TKQ)",
    role: "pendidik",
    unit: "TKQ",
    groupIds: ["TKB"],
  };
  d.users.u9 = {
    id: "u9",
    username: "sari",
    name: "Ibu Sari (wali)",
    role: "wali",
    childIds: ["s2", "s5"],
  };

  const extra: [string, string, string][] = [
    ["s7", "Alya", "TKA"],
    ["s8", "Bima", "TKA"],
    ["s9", "Citra", "TKB"],
    ["s10", "Dafa", "TKB"],
    ["s11", "Ezra", "H1"],
    ["s12", "Farhan", "H2"],
  ];
  for (const [id, name, groupId] of extra)
    d.students[id] = { id, name, groupId };

  const ids = Object.keys(d.students);

  // Absensi 6 hari terakhir. Hari ini hanya TKB yang terisi, supaya pengingat tampil.
  ids.forEach((id, idx) => {
    const s = d.students[id];
    for (let off = 6; off >= 0; off--) {
      if (off === 0 && s.groupId !== "TKB") continue;
      d.attendance.push({
        studentId: id,
        groupId: s.groupId,
        date: addDays(today, -off),
        status: PAT[(idx * 3 + off * 7) % PAT.length],
      });
    }
  });

  // Nilai lengkap, kecuali Salman dan Farhan (kolom terakhir kosong).
  ids.forEach((id, idx) => {
    const comps = d.components[d.groups[d.students[id].groupId].unit];
    const base = 68 + ((idx * 7) % 24);
    const sc: Record<string, number> = {};
    comps.forEach((c, ci) => {
      sc[c.name] = Math.min(100, base + ((ci * 5 + idx * 3) % 12));
    });
    if (id === "s6" || id === "s12") delete sc[comps[comps.length - 1].name];
    d.scores[id] = sc;
  });

  d.reports = {
    s1: { status: "published", version: 1 },
    s2: { status: "submitted", version: 1 },
    s3: { status: "approved", version: 1 },
    s4: { status: "submitted", version: 1 },
    s5: { status: "submitted", version: 1 },
  };

  d.notes = [
    {
      id: "n3",
      studentId: "s4",
      authorId: "u4",
      at: now,
      text: "Hanif lancar menyetor Al-Baqarah ayat 1–141 pekan ini. Mohon dibantu murojaah di rumah.",
      replies: [],
    },
    {
      id: "n2",
      studentId: "s1",
      authorId: "u3",
      at: now,
      text: "Mohon membawa pakaian ganti pada hari Jumat untuk kegiatan bermain air.",
      replies: [],
    },
    {
      id: "n1",
      studentId: "s1",
      authorId: "u3",
      at: `${addDays(today, -2)}T03:00:00.000Z`,
      readAt: `${addDays(today, -2)}T10:00:00.000Z`,
      text: "Naira mulai rapi menulis huruf hijaiyah dan mau berbagi alat tulis dengan temannya.",
      replies: [
        {
          id: "r1",
          authorId: "u6",
          text: "Alhamdulillah, terima kasih Ustadzah.",
          at: `${addDays(today, -2)}T10:00:00.000Z`,
        },
      ],
    },
  ];

  d.incidents = [
    {
      id: "i2",
      studentId: "s6",
      authorId: "u5",
      category: "Perlindungan anak",
      level: "sensitif",
      occurredAt: now,
      location: "",
      chronology:
        "Contoh catatan sensitif untuk mendemonstrasikan pembatasan akses. Data fiktif.",
      initialAction: "",
      status: "Baru",
      followUp: "",
      createdAt: now,
    },
    {
      id: "i1",
      studentId: "s2",
      authorId: "u3",
      category: "Kesehatan ringan",
      level: "biasa",
      occurredAt: `${addDays(today, -1)}T02:00:00.000Z`,
      location: "Halaman sekolah",
      chronology:
        "Fadil mengeluh pusing setelah bermain. Diberi waktu istirahat dan air minum.",
      initialAction: "Istirahat di ruang kelas, orang tua dihubungi.",
      status: "Ditindaklanjuti",
      followUp: "Orang tua menjemput. Kondisi dipantau keesokan hari.",
      createdAt: `${addDays(today, -1)}T02:00:00.000Z`,
    },
  ];

  // Terbaru di indeks 0, sama seperti store.
  const R = (
    studentId: string,
    off: number,
    kind: RecitationKind,
    surahNo: number,
    from: number,
    to: number,
    quality: RecitationQuality,
  ): Recitation => ({
    id: `rc-${studentId}-${off}-${surahNo}-${from}`,
    studentId,
    authorId: studentId === "s6" ? "u7" : "u4",
    surahNo,
    surah: surahByNo(surahNo)?.name ?? "",
    date: addDays(today, -off),
    kind,
    from,
    to,
    quality,
    createdAt: `${addDays(today, -off)}T03:00:00.000Z`,
  });
  d.recitations = [
    R("s4", 1, "Setoran baru", 112, 1, 4, "Lancar"),
    R("s5", 1, "Setoran baru", 79, 1, 25, "Cukup"),
    R("s4", 2, "Setoran baru", 114, 1, 6, "Lancar"),
    R("s11", 2, "Setoran baru", 67, 1, 30, "Lancar"),
    R("s6", 2, "Setoran baru", 67, 1, 15, "Perlu diulang"),
    R("s4", 3, "Murojaah", 1, 1, 7, "Lancar"),
    R("s5", 3, "Setoran baru", 78, 1, 40, "Lancar"),
    R("s4", 4, "Setoran baru", 2, 51, 141, "Cukup"),
    R("s4", 5, "Setoran baru", 2, 1, 50, "Lancar"),
    R("s4", 6, "Setoran baru", 1, 1, 7, "Lancar"),
  ];

  d.audit = [
    {
      id: "a3",
      at: now,
      actor: "Kepala TKQ",
      action: "Rapor Dipublikasikan",
      object: "Naira",
      detail: "v1",
    },
    {
      id: "a2",
      at: now,
      actor: "Ustadzah Aisyah (guru TKQ)",
      action: "Rapor Diajukan",
      object: "Fadil",
      detail: "v1",
    },
    {
      id: "a1",
      at: now,
      actor: "Ustadz Hamzah (murabbi RTQ)",
      action: "Setoran hafalan",
      object: "Hanif",
      detail: "Setoran baru: Al-Ikhlas 1–4, Lancar",
    },
  ];

  const asp = (p: "A", text: string) => ({ predikat: p, text });
  const hanif = newRtqReport("s4", d.academic.year, 1);
  d.rtqReports[rtqKey("s4", d.academic.year, 1)] = {
    ...hanif,
    status: "submitted",
    akhlak: {
      tuturKata: asp(
        "A",
        "Ananda bertutur kata dengan sopan, santun, dan lemah lembut kepada ustaz/ustazah serta teman-temannya.",
      ),
      sikap: asp(
        "A",
        "Ananda menunjukkan sikap yang baik, menghormati ustaz/ustazah, menaati arahan, dan mampu menjaga adab.",
      ),
    },
    tahsin: {
      kelancaran: asp(
        "A",
        "Ananda mampu membaca dan menghafal surah-surah Juz 30 dengan lancar, baik, dan minim kesalahan.",
      ),
      makhraj: asp(
        "A",
        "Ananda mampu melafalkan huruf hijaiyah dengan tepat sesuai makhraj dan sifat hurufnya.",
      ),
      tajwid: asp(
        "A",
        "Ananda mampu menerapkan hukum tajwid dengan tepat saat membaca Al-Qur'an.",
      ),
    },
    tahfidz: [
      {
        surahNo: 104,
        name: "Al-Humazah",
        from: 1,
        to: 9,
        harian: 80,
        evaluasi: 95,
      },
      {
        surahNo: 103,
        name: "Al-Asr",
        from: 1,
        to: 3,
        harian: 80,
        evaluasi: 95,
      },
      {
        surahNo: 102,
        name: "At-Takasur",
        from: 1,
        to: 8,
        harian: 79,
        evaluasi: 95,
      },
      {
        surahNo: 101,
        name: "Al-Qariah",
        from: 1,
        to: 11,
        harian: 80,
        evaluasi: 85,
      },
      {
        surahNo: 100,
        name: "Al-Adiyat",
        from: 1,
        to: 11,
        harian: 88,
        evaluasi: 95,
      },
    ],
    catatan: "Sering-sering murojaah ya, semangat!",
    absence: { sakit: 2, izin: 1, tanpa: 0 },
  };
  return d;
}
