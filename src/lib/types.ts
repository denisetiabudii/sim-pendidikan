export type Unit = "TKQ" | "RTQ";
export type Role = "direktur" | "kepala" | "pendidik" | "wali";
export type AttendanceStatus =
  | "Hadir"
  | "Izin"
  | "Sakit"
  | "Alpa"
  | "Terlambat";
export type ReportStatus = "draft" | "submitted" | "approved" | "published";

export interface Report {
  status: ReportStatus;
  version: number;
  revisions?: { version: number; reason: string; at: string }[];
}
export interface User {
  id: string;
  name: string;
  username?: string;
  role: Role;
  unit?: Unit;
  groupIds?: string[];
  childIds?: string[];
}
export interface Group {
  id: string;
  name: string;
  unit: Unit;
}
export interface Student { id: string; name: string; groupId: string; bio?: StudentBio }
export interface Component {
  name: string;
  weight: number;
}
export interface Attendance {
  studentId: string;
  groupId: string;
  date: string;
  status: AttendanceStatus;
}
export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  object: string;
  detail: string;
}
export interface AppData {
  users: Record<string, User>;
  groups: Record<string, Group>;
  students: Record<string, Student>;
  components: Record<Unit, Component[]>;
  attendance: Attendance[];
  scores: Record<string, Record<string, number>>; // studentId → nama komponen → nilai
  reports: Record<string, Report>;
  notes: Note[];
  incidentCategories: IncidentCategory[];
  incidents: Incident[];
  imports: ImportBatch[];
  recitations: Recitation[];
  rtqReports: Record<string, RtqReport>;
  institution: Institution;
  academic: Academic; // studentId → status rapor
    paiTemplate: PaiSection[];
  tkqReports: Record<string, TkqReport>;
  institutionTkq: Institution;
  audit: AuditEntry[];
}

export interface NoteReply {
  id: string;
  authorId: string;
  text: string;
  at: string;
}
export interface Note {
  id: string;
  studentId: string;
  authorId: string;
  text: string;
  at: string;
  readAt?: string;
  replies: NoteReply[];
}

export type IncidentLevel = "biasa" | "sensitif";
export type IncidentStatus = "Baru" | "Ditindaklanjuti" | "Selesai";
export interface IncidentCategory {
  name: string;
  level: IncidentLevel;
}
export interface Incident {
  id: string;
  studentId: string;
  authorId: string;
  category: string;
  level: IncidentLevel;
  occurredAt: string;
  location: string;
  chronology: string;
  initialAction: string;
  status: IncidentStatus;
  followUp: string;
  createdAt: string;
}

export interface ImportBatch {
  id: string;
  at: string;
  actorId: string;
  studentIds: string[];
}

export type RecitationKind = "Setoran baru" | "Murojaah";
export type RecitationQuality = "Lancar" | "Cukup" | "Perlu diulang";
export interface Recitation {
  id: string;
  studentId: string;
  authorId: string;
  surahNo: number;
  date: string; // YYYY-MM-DD
  kind: RecitationKind;
  surah: string;
  from: number;
  to: number;
  quality: RecitationQuality;
  createdAt: string;
}

export type Predikat = "A" | "A-" | "B" | "B-" | "C" | "C-" | "D" | "D-";
export type Quarter = 1 | 2 | 3;
export interface RtqAspect {
  predikat: Predikat | "";
  text: string;
}
export interface RtqSurahRow {
  surahNo: number; // 0 = nama ditulis manual
  name: string;
  from: number;
  to: number;
  harian: number | null;
  evaluasi: number | null;
}
export interface RtqReport {
  studentId: string;
  year: string;
  quarter: Quarter;
  status: ReportStatus;
  version: number;
  akhlak: { tuturKata: RtqAspect; sikap: RtqAspect };
  tahsin: { kelancaran: RtqAspect; makhraj: RtqAspect; tajwid: RtqAspect };
  tahfidz: RtqSurahRow[];
  catatan: string;
  absence?: { sakit: number; izin: number; tanpa: number }; // dibekukan saat diajukan
  revisions?: { version: number; reason: string; at: string }[];
}
export interface Institution {
  name: string;
  nomorStatistik: string;
  address: string;
  city: string;
  mudir: string;
  logoDataUrl?: string;
  email?: string;
}
export interface Academic {
  year: string;
  quarters: { start: string; end: string; signDate: string }[];
}

export type Rating = "BB" | "MB" | "BSH" | "BSB";
export interface PaiItem { id: string; text: string; heading?: boolean }
export interface PaiSection { id: string; no: string; title: string; items: PaiItem[] }

export interface StudentBio {
  nickname: string; nomorInduk: string; birthPlace: string; birthDate: string; gender: string; religion: string; childNo: string;
  father: string; mother: string; fatherJob: string; motherJob: string;
  street: string; phone: string; village: string; district: string; regency: string; province: string;
  guardianName: string; guardianJob: string; guardianAddress: string;
}

export interface TkqReport {
  studentId: string;
  year: string;
  quarter: Quarter;
  status: ReportStatus;
  version: number;
  usia: string;
  pai: Record<string, Rating>;
  capaian: { agama: string; jatiDiri: string; literasi: string };
  pertumbuhan: { bb: number | null; tb: number | null; lk: number | null };
  projek: {
    topik: string;
    fase: string;
    dimensi: { iman: string; kebinekaan: string; gotong: string; mandiri: string; kreatif: string; nalar: string };
  };
  absence?: { sakit: number; izin: number; tanpa: number };
  revisions?: { version: number; reason: string; at: string }[];
}
export type TkqContent = Pick<TkqReport, "usia" | "pai" | "capaian" | "pertumbuhan" | "projek">;