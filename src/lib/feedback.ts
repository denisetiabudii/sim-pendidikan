import { notify } from "./toast";

type Res = { ok: boolean; error?: string; code?: string; count?: number };
type Rule = (args: unknown[], r: Res) => string | null;

const REPORT: Record<string, string> = {
  submit: "Rapor diajukan untuk persetujuan",
  return: "Rapor dikembalikan ke draft",
  approve: "Rapor disetujui",
  publish: "Rapor dipublikasikan",
  revise: "Versi revisi rapor dibuat",
};
const ok = (t: string): Rule => () => t;

// Aksi yang tidak tercantum di sini tidak memunculkan pesan.
export const RULES: Record<string, Rule> = {
  signIn: () => null,
  chooseGroups: () => null,
  markNoteRead: () => null,
  openIncident: () => null,
  recordAttendance: ok("Absensi tersimpan"),
  setScore: ok("Nilai tersimpan"),
  changeReport: (a) => REPORT[a[1] as string] ?? "Status rapor diperbarui",
  changeRtqReport: (a) => REPORT[a[2] as string] ?? "Status rapor diperbarui",
  saveRtqDraft: ok("Draft rapor tersimpan"),
  addRecitation: ok("Setoran tercatat"),
  addIncident: ok("Catatan kejadian tersimpan"),
  updateIncident: ok("Kejadian diperbarui"),
  addNote: ok("Catatan terkirim"),
  replyNote: ok("Balasan terkirim"),
  importStudents: (_a, r) => `${r.count ?? 0} peserta berhasil diimpor`,
  undoImport: ok("Impor dibatalkan"),
  addEducator: ok("Pendidik ditambahkan"),
  assignEducator: ok("Penugasan ditambahkan"),
  unassignEducator: ok("Penugasan dicabut"),
  setWeight: ok("Bobot diperbarui"),
  addGroup: ok("Kelas atau halaqoh ditambahkan"),
  saveInstitution: ok("Identitas lembaga tersimpan"),
  saveAcademic: ok("Tahun ajaran dan kuartal tersimpan"),
};

// Membungkus aksi store: sukses menampilkan pesan hijau, gagal menampilkan pesan merah.
// Peringatan tumpang tindih setoran dilewati karena halamannya yang meminta konfirmasi.


export function withFeedback<T extends object>(base: T): T {
  const out = { ...base };

  const mutableOut = out as {
    [key: string]: unknown;
  };

  for (const [name, fn] of Object.entries(base)) {
    const rule = RULES[name];
    if (!rule || typeof fn !== "function") continue;

    mutableOut[name] = (...args: unknown[]) => {
      const r = (fn as (...a: unknown[]) => Res)(...args);

      if (r.ok) {
        const text = rule(args, r);
        if (text) notify("success", text);
      } else if (r.code !== "overlap" && r.error) {
        notify("error", r.error);
      }

      return r;
    };
  }

  return out;
}
