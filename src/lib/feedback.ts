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
    saveStudentBio: ok("Biodata tersimpan"),
  saveTkqDraft: ok("Draft rapor tersimpan"),
  changeTkqReport: (a) => REPORT[a[2] as string] ?? "Status rapor diperbarui",
};

// Membungkus aksi store: sukses menampilkan pesan hijau, gagal menampilkan pesan merah.
// Peringatan tumpang tindih setoran dilewati karena halamannya yang meminta konfirmasi.


export function withFeedback<T extends object>(base: T): T {
  const src = base as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  for (const [name, fn] of Object.entries(src)) {
    if (typeof fn !== "function") continue;
    const rule = RULES[name];
    out[name] = (...args: unknown[]) => {
      const r = (fn as (...a: unknown[]) => unknown)(...args);
      if (r && typeof r === "object" && "ok" in r) {
        const res = r as Res;
        if (res.ok) {
          const text = rule?.(args, res);
          if (text) notify("success", text);
        } else if (res.code !== "overlap" && res.error) notify("error", res.error);
      }
      return r;
    };
  }
  return out as T;
}