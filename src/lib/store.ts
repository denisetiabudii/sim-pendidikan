"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seed } from "./seed";
import { canEditGroup, canSeeStudent, canViewIncident, educatorUnit } from "./access";
import { finalScore, isScoreLocked, weightsLocked } from "./grades";
import { getReport, STATUS_LABEL } from "./reports";
import type {
  AppData,
  AttendanceStatus,
  IncidentStatus,
  RecitationKind,
  RecitationQuality,
  ReportStatus,
  Unit,
} from "./types";
import { importBatchInUse, MAX_ROWS, validateRows } from "./csv";
import { RECITATION_KINDS, RECITATION_QUALITIES } from "./constants";
import { surahByNo, validateAyatRange } from "./quran";
import { findOverlap } from "./hafalan";
import { demoData } from "./demo";



type Result = { ok: true } | { ok: false; error: string; code?: string };
type ImportResult = { ok: true; count: number } | { ok: false; error: string };
export type ReportAction = "submit" | "return" | "approve" | "publish" | "revise";

interface State {
  data: AppData;
  currentUserId: string;
  login: (id: string) => void;
  recordAttendance: (
    studentId: string,
    date: string,
    status: AttendanceStatus,
    reason?: string
  ) => Result;
  setScore: (studentId: string, component: string, value: number | null) => Result;
  changeReport: (studentId: string, action: ReportAction, reason?: string) => Result;
    setWeight: (unit: Unit, component: string, weight: number) => Result;
  addGroup: (name: string, unit: Unit) => Result;
    addEducator: (name: string, unit: Unit) => Result;
  assignEducator: (userId: string, groupId: string) => Result;
  unassignEducator: (userId: string, groupId: string) => Result;
  addNote: (studentId: string, text: string) => Result;
  markNoteRead: (noteId: string) => Result;
  replyNote: (noteId: string, text: string) => Result;
    addIncident: (input: {
    studentId: string;
    category: string;
    occurredAt: string;
    location: string;
    chronology: string;
    initialAction: string;
  }) => Result;
  openIncident: (id: string) => Result;
  updateIncident: (id: string, status: IncidentStatus, followUp: string) => Result;
    importStudents: (rows: string[][]) => ImportResult;
   undoImport: (batchId: string) => Result;
     addRecitation: (input: {
    studentId: string;
    date: string;
    kind: RecitationKind;
        surahNo: number;
    from: number;
    to: number;
    quality: RecitationQuality;
        confirmOverlap?: boolean;
  }) => Result;
    loadDemo: (today: string) => void;
  reset: () => void;
}

const denied = { ok: false as const, error: "Ditolak: di luar penugasan Anda" };

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const audit = (
        data: AppData,
        actor: string,
        action: string,
        object: string,
        detail: string
      ) => [
        { id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, object, detail },
        ...data.audit,
      ];

      return {
        data: seed(),
        currentUserId: "u3",
        login: (id) => set({ currentUserId: id }),

        recordAttendance: (studentId, date, status, reason) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const student = data.students[studentId];
          if (
            !student ||
            !canSeeStudent(data, user, studentId) ||
            !canEditGroup(data, user, student.groupId)
          )
            return denied;

          // BR-04: satu catatan per peserta, kelompok, dan tanggal
          const existing = data.attendance.find(
            (a) => a.studentId === studentId && a.groupId === student.groupId && a.date === date
          );
          if (existing && !reason?.trim())
            return { ok: false, error: "Koreksi wajib disertai alasan" };

          const attendance = existing
            ? data.attendance.map((a) => (a === existing ? { ...a, status } : a))
            : [...data.attendance, { studentId, groupId: student.groupId, date, status }];

          set({
            data: {
              ...data,
              attendance,
              audit: audit(
                data,
                user.name,
                existing ? "Koreksi absensi" : "Absensi",
                student.name,
                existing ? `${existing.status} → ${status}. Alasan: ${reason}` : status
              ),
            },
          });
          return { ok: true };
        },

        setScore: (studentId, component, value) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const student = data.students[studentId];
          if (
            !student ||
            user.role !== "pendidik" ||
            !canSeeStudent(data, user, studentId) ||
            !canEditGroup(data, user, student.groupId)
          )
            return denied;

          if (isScoreLocked(data, studentId))
            return { ok: false, error: "Nilai terkunci. Gunakan proses revisi rapor." };

          const unit = data.groups[student.groupId].unit;
          if (!data.components[unit].some((c) => c.name === component))
            return { ok: false, error: "Komponen tidak dikenal" };
          if (value !== null && (Number.isNaN(value) || value < 0 || value > 100))
            return { ok: false, error: "Nilai harus 0–100" };

          const current = { ...(data.scores[studentId] ?? {}) };
          if (value === null) delete current[component];
          else current[component] = value;

          set({
            data: {
              ...data,
              scores: { ...data.scores, [studentId]: current },
              audit: audit(data, user.name, "Nilai", student.name, `${component} = ${value ?? "kosong"}`),
            },
          });
          return { ok: true };
        },

        changeReport: (studentId, action, reason) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const student = data.students[studentId];
          if (!student || !canSeeStudent(data, user, studentId)) return denied;

          const unit = data.groups[student.groupId].unit;
          const rep = getReport(data, studentId);
          const isTeacher = user.role === "pendidik" && canEditGroup(data, user, student.groupId);
          const isHead = user.role === "kepala" && user.unit === unit;

          let next: ReportStatus;
          let revisions = rep.revisions;
          let version = rep.version;
          let detail = `v${rep.version}`;

          if (action === "submit") {
            if (!isTeacher || rep.status !== "draft") return denied;
            const fin = finalScore(data.components[unit], data.scores[studentId]);
            if (fin === null)
              return { ok: false, error: "Nilai belum lengkap atau total bobot bukan 100%" };
            next = "submitted";
          } else if (action === "return") {
            if (!isHead || rep.status !== "submitted") return denied;
            next = "draft";
          } else if (action === "approve") {
            if (!isHead || rep.status !== "submitted") return denied;
            next = "approved";
          } else if (action === "publish") {
            if (!isHead || rep.status !== "approved") return denied;
            next = "published";
          } else {
            if (!isHead || rep.status !== "published") return denied;
            if (!reason?.trim()) return { ok: false, error: "Alasan revisi wajib diisi" };
            next = "draft";
            version = rep.version + 1;
            revisions = [
              ...(rep.revisions ?? []),
              { version, reason: reason.trim(), at: new Date().toISOString() },
            ];
            detail = `v${rep.version} → v${version}. Alasan: ${reason.trim()}`;
          }

          set({
            data: {
              ...data,
              reports: { ...data.reports, [studentId]: { status: next, version, revisions } },
              audit: audit(data, user.name, `Rapor ${STATUS_LABEL[next]}`, student.name, detail),
            },
          });
          return { ok: true };
        },

                setWeight: (unit, component, weight) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const allowed =
            user.role === "direktur" || (user.role === "kepala" && user.unit === unit);
          if (!allowed) return denied;

          if (!Number.isInteger(weight) || weight < 0 || weight > 100)
            return { ok: false, error: "Bobot harus bilangan bulat 0–100" };

          // BR-06: jangan ubah bobot bila sudah ada rapor disetujui/dipublikasikan di unit ini.
                    const locked = weightsLocked(data, unit);
          if (locked)
            return {
              ok: false,
              error: "Bobot terkunci: sudah ada rapor disetujui atau dipublikasikan di unit ini.",
            };

          const old = data.components[unit].find((c) => c.name === component);
          if (!old) return { ok: false, error: "Komponen tidak dikenal" };

          set({
            data: {
              ...data,
              components: {
                ...data.components,
                [unit]: data.components[unit].map((c) =>
                  c.name === component ? { ...c, weight } : c
                ),
              },
              audit: audit(data, user.name, "Ubah bobot", unit, `${component}: ${old.weight}% → ${weight}%`),
            },
          });
          return { ok: true };
        },

        addGroup: (name, unit) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const allowed =
            user.role === "direktur" || (user.role === "kepala" && user.unit === unit);
          if (!allowed) return denied;

          const clean = name.trim();
          if (!clean) return { ok: false, error: "Nama wajib diisi" };
          if (
            Object.values(data.groups).some(
              (g) => g.unit === unit && g.name.toLowerCase() === clean.toLowerCase()
            )
          )
            return { ok: false, error: "Nama sudah dipakai di unit ini" };

          const id = `g-${crypto.randomUUID().slice(0, 8)}`;
          set({
            data: {
              ...data,
              groups: { ...data.groups, [id]: { id, name: clean, unit } },
              audit: audit(data, user.name, "Tambah kelompok", unit, clean),
            },
          });
          return { ok: true };
        },

                addEducator: (name, unit) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          if (!(user.role === "direktur" || (user.role === "kepala" && user.unit === unit)))
            return denied;
          const clean = name.trim();
          if (!clean) return { ok: false, error: "Nama wajib diisi" };

          const id = `u-${crypto.randomUUID().slice(0, 8)}`;
          set({
            data: {
              ...data,
              users: {
                ...data.users,
                [id]: { id, name: clean, role: "pendidik", unit, groupIds: [] },
              },
              audit: audit(data, user.name, "Tambah pendidik", unit, clean),
            },
          });
          return { ok: true };
        },

        assignEducator: (userId, groupId) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const target = data.users[userId];
          const group = data.groups[groupId];
          if (!target || !group || target.role !== "pendidik")
            return { ok: false, error: "Pendidik atau kelompok tidak valid" };
          if (!(user.role === "direktur" || (user.role === "kepala" && user.unit === group.unit)))
            return denied;

          const tu = educatorUnit(data, target);
          if (tu && tu !== group.unit)
            return {
              ok: false,
              error: `Pendidik ini bertugas di ${tu}. Penugasan lintas unit belum diizinkan.`,
            };
          if (target.groupIds?.includes(groupId))
            return { ok: false, error: "Sudah ditugaskan di kelompok ini" };

          set({
            data: {
              ...data,
              users: {
                ...data.users,
                [userId]: {
                  ...target,
                  unit: tu ?? group.unit,
                  groupIds: [...(target.groupIds ?? []), groupId],
                },
              },
              audit: audit(data, user.name, "Penugasan", target.name, `+ ${group.unit} ${group.name}`),
            },
          });
          return { ok: true };
        },

        unassignEducator: (userId, groupId) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const target = data.users[userId];
          const group = data.groups[groupId];
          if (!target || !group || target.role !== "pendidik")
            return { ok: false, error: "Pendidik atau kelompok tidak valid" };
          if (!(user.role === "direktur" || (user.role === "kepala" && user.unit === group.unit)))
            return denied;

          set({
            data: {
              ...data,
              users: {
                ...data.users,
                [userId]: {
                  ...target,
                  groupIds: (target.groupIds ?? []).filter((g) => g !== groupId),
                },
              },
              audit: audit(data, user.name, "Cabut penugasan", target.name, `- ${group.unit} ${group.name}`),
            },
          });
          return { ok: true };
        },

        addNote: (studentId, text) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const student = data.students[studentId];
          if (
            !student ||
            user.role !== "pendidik" ||
            !canSeeStudent(data, user, studentId) ||
            !canEditGroup(data, user, student.groupId)
          )
            return denied;

          const clean = text.trim();
          if (!clean) return { ok: false, error: "Isi catatan terlebih dahulu" };
          if (clean.length > 1000) return { ok: false, error: "Maksimal 1000 karakter" };

          const note = {
            id: crypto.randomUUID(),
            studentId,
            authorId: user.id,
            text: clean,
            at: new Date().toISOString(),
            replies: [],
          };
          set({
            data: {
              ...data,
              notes: [note, ...data.notes],
              audit: audit(data, user.name, "Buku penghubung", student.name, "Catatan dikirim"),
            },
          });
          return { ok: true };
        },

        markNoteRead: (noteId) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const note = data.notes.find((n) => n.id === noteId);
          if (!note || user.role !== "wali" || !canSeeStudent(data, user, note.studentId))
            return denied;
          if (note.readAt) return { ok: true };

          set({
            data: {
              ...data,
              notes: data.notes.map((n) =>
                n.id === noteId ? { ...n, readAt: new Date().toISOString() } : n
              ),
            },
          });
          return { ok: true };
        },

        replyNote: (noteId, text) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const note = data.notes.find((n) => n.id === noteId);
          if (!note || !canSeeStudent(data, user, note.studentId)) return denied;
          const student = data.students[note.studentId];
          const allowed =
            user.role === "wali" ||
            (user.role === "pendidik" && canEditGroup(data, user, student.groupId));
          if (!allowed) return denied;

          const clean = text.trim();
          if (!clean) return { ok: false, error: "Isi balasan terlebih dahulu" };
          if (clean.length > 1000) return { ok: false, error: "Maksimal 1000 karakter" };

          const reply = {
            id: crypto.randomUUID(),
            authorId: user.id,
            text: clean,
            at: new Date().toISOString(),
          };
          set({
            data: {
              ...data,
              notes: data.notes.map((n) =>
                n.id === noteId ? { ...n, replies: [...n.replies, reply] } : n
              ),
            },
          });
          return { ok: true };
        },

                addIncident: (input) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const student = data.students[input.studentId];
          if (!student || !canSeeStudent(data, user, input.studentId)) return denied;

          const unit = data.groups[student.groupId].unit;
          const isTeacher =
            user.role === "pendidik" && canEditGroup(data, user, student.groupId);
          const isHead = user.role === "kepala" && user.unit === unit;
          if (!isTeacher && !isHead) return denied;

          const cat = data.incidentCategories.find((c) => c.name === input.category);
          if (!cat) return { ok: false, error: "Kategori tidak dikenal" };

          const chronology = input.chronology.trim();
          if (!chronology) return { ok: false, error: "Kronologi wajib diisi" };
          if (chronology.length > 2000) return { ok: false, error: "Kronologi maksimal 2000 karakter" };

          const when = input.occurredAt ? new Date(input.occurredAt) : new Date();
          if (Number.isNaN(when.getTime())) return { ok: false, error: "Waktu tidak valid" };

          const incident = {
            id: crypto.randomUUID(),
            studentId: input.studentId,
            authorId: user.id,
            category: cat.name,
            level: cat.level,
            occurredAt: when.toISOString(),
            location: input.location.trim(),
            chronology,
            initialAction: input.initialAction.trim(),
            status: "Baru" as IncidentStatus,
            followUp: "",
            createdAt: new Date().toISOString(),
          };
          set({
            data: {
              ...data,
              incidents: [incident, ...data.incidents],
              audit: audit(
                data,
                user.name,
                "Catat kejadian",
                student.name,
                cat.level === "sensitif" ? `${cat.name} (sensitif)` : cat.name
              ),
            },
          });
          return { ok: true };
        },

        openIncident: (id) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const inc = data.incidents.find((i) => i.id === id);
          if (!inc || !canViewIncident(data, user, inc)) return denied;

          // Pembukaan catatan sensitif dicatat (PRD 4.9). Isinya tidak ikut dicatat.
          if (inc.level === "sensitif")
            set({
              data: {
                ...data,
                audit: audit(
                  data,
                  user.name,
                  "Buka catatan sensitif",
                  data.students[inc.studentId].name,
                  inc.category
                ),
              },
            });
          return { ok: true };
        },

        updateIncident: (id, status, followUp) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const inc = data.incidents.find((i) => i.id === id);
          if (!inc || !canViewIncident(data, user, inc)) return denied;

          const student = data.students[inc.studentId];
          const unit = data.groups[student.groupId].unit;
          if (!(user.role === "kepala" && user.unit === unit)) return denied;

          if (!["Baru", "Ditindaklanjuti", "Selesai"].includes(status))
            return { ok: false, error: "Status tidak valid" };
          const fu = followUp.trim();
          if (fu.length > 2000) return { ok: false, error: "Tindak lanjut maksimal 2000 karakter" };

          const detail =
            `${inc.status} → ${status}` + (fu !== inc.followUp ? ", tindak lanjut diperbarui" : "");
          set({
            data: {
              ...data,
              incidents: data.incidents.map((i) =>
                i.id === id ? { ...i, status, followUp: fu } : i
              ),
              audit: audit(data, user.name, "Ubah kejadian", student.name, detail),
            },
          });
          return { ok: true };
        },

                importStudents: (raw) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          if (user.role !== "direktur" && user.role !== "kepala") return denied;
          if (raw.length > MAX_ROWS + 1)
            return { ok: false, error: `Maksimal ${MAX_ROWS} baris per impor` };

          // Validasi ulang di sini; hasil pratinjau di halaman tidak dipercaya.
          const rows = validateRows(data, user, raw);
          const valid = rows.filter((r) => !r.error && r.groupId);
          if (valid.length === 0) return { ok: false, error: "Tidak ada baris valid untuk diimpor" };

          const students = { ...data.students };
          const ids: string[] = [];
          for (const r of valid) {
            const id = `s-${crypto.randomUUID().slice(0, 8)}`;
            students[id] = { id, name: r.name, groupId: r.groupId as string };
            ids.push(id);
          }

          const batch = {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            actorId: user.id,
            studentIds: ids,
          };
          set({
            data: {
              ...data,
              students,
              imports: [batch, ...data.imports],
              audit: audit(
                data,
                user.name,
                "Impor peserta",
                "CSV",
                `${ids.length} peserta diimpor, ${rows.length - valid.length} baris dilewati`
              ),
            },
          });
          return { ok: true, count: ids.length };
        },

                undoImport: (batchId) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const batch = data.imports.find((b) => b.id === batchId);
          if (!batch) return { ok: false, error: "Impor tidak ditemukan" };
          if (!(user.role === "direktur" || batch.actorId === user.id)) return denied;

          if (importBatchInUse(data, batch))
            return {
              ok: false,
              error: "Tidak bisa dibatalkan: peserta hasil impor ini sudah punya data akademik.",
            };

          const ids = new Set(batch.studentIds);
          const students = { ...data.students };
          for (const id of ids) delete students[id];

          set({
            data: {
              ...data,
              students,
              imports: data.imports.filter((b) => b.id !== batchId),
              audit: audit(
                data,
                user.name,
                "Batalkan impor",
                "CSV",
                `${ids.size} peserta dihapus (impor ${new Date(batch.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })})`
              ),
            },
          });
          return { ok: true };
        },

                addRecitation: (input) => {
          const { data, currentUserId } = get();
          const user = data.users[currentUserId];
          const student = data.students[input.studentId];
          if (
            !student ||
            user.role !== "pendidik" ||
            !canSeeStudent(data, user, input.studentId) ||
            !canEditGroup(data, user, student.groupId)
          )
            return denied;

          if (data.groups[student.groupId].unit !== "RTQ")
            return { ok: false, error: "Setoran hafalan hanya untuk peserta RTQ" };

                    const info = surahByNo(input.surahNo);
          if (!info) return { ok: false, error: "Surah tidak valid" };

          const { from, to } = input;
          const rangeError = validateAyatRange(input.surahNo, from, to);
          if (rangeError) return { ok: false, error: rangeError };
                    const overlapHit =
            input.kind === "Setoran baru"
              ? findOverlap(data.recitations, input.studentId, input.surahNo, from, to)
              : undefined;
          if (overlapHit && !input.confirmOverlap)
            return {
              ok: false,
              code: "overlap",
              error: `Sebagian ayat ini sudah tercatat sebagai setoran baru: ${overlapHit.surah} ${overlapHit.from}–${overlapHit.to} (${overlapHit.date}).`,
            };

          if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date))
            return { ok: false, error: "Tanggal tidak valid" };
          if (!RECITATION_KINDS.includes(input.kind) || !RECITATION_QUALITIES.includes(input.quality))
            return { ok: false, error: "Jenis atau kualitas tidak valid" };

          const rec = {
            id: crypto.randomUUID(),
            studentId: input.studentId,
            authorId: user.id,
            date: input.date,
            kind: input.kind,
                        surahNo: info.no,
            surah: info.name,
            from,
            to,
            quality: input.quality,
            createdAt: new Date().toISOString(),
          };
          set({
            data: {
              ...data,
              recitations: [rec, ...data.recitations],
              audit: audit(
                data,
                user.name,
                "Setoran hafalan",
                student.name,
                `${input.kind}: ${info.name} ${from}–${to}, ${input.quality}${overlapHit ? " (tumpang tindih dikonfirmasi)" : ""}`
              ),
            },
          });
          return { ok: true };
        },

                loadDemo: (today) => set({ data: demoData(today), currentUserId: "u3" }),

        reset: () => set({ data: seed(), currentUserId: "u3" }),
      };
    },
    { name: "simp-next-v7", skipHydration: true }
  )
);