import { canViewIncident, myGroupIds } from "./access";
import { finalScore } from "./grades";
import { getReport } from "./reports";
import type { AppData, User, Quarter, ReportStatus, Unit } from "./types";
import { reportProblems, rtqKey } from "./rtq";


// Daftar tanggal berurutan (terlama ke terbaru) yang berakhir pada `today`.
export function lastDays(today: string, n: number): string[] {
  if (!today) return [];
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(`${today}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() - i);
    out.push(t.toISOString().slice(0, 10));
  }
  return out;
}

// Persentase Hadir + Terlambat dari catatan yang ada. null bila belum ada catatan.
export function attendanceRate(data: AppData, studentIds: string[], dates: string[]): number | null {
  const ids = new Set(studentIds);
  const ds = new Set(dates);
  const recs = data.attendance.filter((a) => ids.has(a.studentId) && ds.has(a.date));
  if (recs.length === 0) return null;
  const ok = recs.filter((a) => a.status === "Hadir" || a.status === "Terlambat").length;
  return Math.round((ok / recs.length) * 100);
}

export function missingAttendance(data: AppData, user: User, today: string) {
  if (!today) return [];
  return myGroupIds(data, user)
    .map((g) => {
      const students = Object.values(data.students).filter((s) => s.groupId === g);
      const missing = students.filter(
        (s) => !data.attendance.some((a) => a.studentId === s.id && a.groupId === g && a.date === today)
      ).length;
      return { groupId: g, missing, total: students.length };
    })
    .filter((x) => x.missing > 0);
}

export function reportBuckets(data: AppData, studentIds: string[]) {
  const b = { draft: 0, readyToSubmit: 0, submitted: 0, approved: 0, published: 0 };
  for (const id of studentIds) {
    const r = getReport(data, id);
    if (r.status === "draft") {
      b.draft++;
      const unit = data.groups[data.students[id].groupId].unit;
      if (finalScore(data.components[unit], data.scores[id]) !== null) b.readyToSubmit++;
    } else b[r.status]++;
  }
  return b;
}

export function incompleteScores(data: AppData, studentIds: string[]): number {
  return studentIds.filter((id) => {
    const unit = data.groups[data.students[id].groupId].unit;
    return finalScore(data.components[unit], data.scores[id]) === null;
  }).length;
}

export const newIncidents = (data: AppData, user: User) =>
  data.incidents.filter((i) => i.status === "Baru" && canViewIncident(data, user, i)).length;

export const unreadNotes = (data: AppData, studentIds: string[]) =>
  data.notes.filter((n) => studentIds.includes(n.studentId) && !n.readAt).length;

const unitOf = (data: AppData, id: string) => data.groups[data.students[id].groupId].unit;

// Status rapor sadar-unit: TKQ memakai rapor lama, RTQ memakai rapor kuartal.
export function reportCountsUnit(data: AppData, ids: string[], quarter: Quarter) {
  const b = { draft: 0, readyToSubmit: 0, submitted: 0, approved: 0, published: 0 };
  for (const id of ids) {
    let status: ReportStatus;
    let ready: boolean;
    if (unitOf(data, id) === "TKQ") {
      status = getReport(data, id).status;
      ready = finalScore(data.components.TKQ, data.scores[id]) !== null;
    } else {
      const r = data.rtqReports[rtqKey(id, data.academic.year, quarter)];
      status = r?.status ?? "draft";
      ready = !!r && reportProblems(r).length === 0;
    }
    if (status === "draft") {
      b.draft++;
      if (ready) b.readyToSubmit++;
    } else b[status]++;
  }
  return b;
}

export function progressBars(data: AppData, ids: string[], unit: Unit, days: string[]) {
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);
  const total = ids.length;
  const bars: { label: string; pct: number | null }[] = [
    { label: "Kehadiran 7 hari terakhir", pct: attendanceRate(data, ids, days) },
  ];
  if (unit === "TKQ") bars.push({ label: "Nilai sudah lengkap", pct: pct(total - incompleteScores(data, ids), total) });
  else {
    const set = new Set(days);
    const active = ids.filter((id) => data.recitations.some((r) => r.studentId === id && set.has(r.date))).length;
    bars.push({ label: "Santri yang menyetor 7 hari terakhir", pct: pct(active, total) });
  }
  return bars;
}

export interface StatusCounts {
  belum: number;
  draft: number;
  submitted: number;
  approved: number;
  published: number;
}
const emptyCounts = (): StatusCounts => ({ belum: 0, draft: 0, submitted: 0, approved: 0, published: 0 });

// Status rapor per unit. RTQ per kuartal (hanya kuartal yang sudah berjalan atau sudah punya rapor).
export function reportStatusRows(data: AppData, ids: string[], unit: Unit, today: string) {
  const mine = ids.filter((id) => unitOf(data, id) === unit);
  if (unit === "TKQ") {
    const c = emptyCounts();
    for (const id of mine) c[getReport(data, id).status]++;
    return [{ label: "Rapor", counts: c }];
  }
  const year = data.academic.year;
  return ([1, 2, 3] as Quarter[])
    .filter(
      (q) =>
        today >= data.academic.quarters[q - 1].start ||
        mine.some((id) => data.rtqReports[rtqKey(id, year, q)])
    )
    .map((q) => {
      const c = emptyCounts();
      for (const id of mine) {
        const r = data.rtqReports[rtqKey(id, year, q)];
        if (r) c[r.status]++;
        else c.belum++;
      }
      return { label: `Kuartal ${q}`, counts: c };
    });
}

export interface ReportTask {
  unit: Unit;
  quarter?: Quarter;
  kind: "ready" | "review" | "publish";
  count: number;
  href: string;
}

// Pekerjaan rapor untuk peran ini, memeriksa semua kuartal (bukan hanya yang berjalan).
export function reportTasks(data: AppData, user: User, ids: string[]): ReportTask[] {
  if (user.role !== "pendidik" && user.role !== "kepala") return [];
  const kinds: ReportTask["kind"][] = user.role === "pendidik" ? ["ready"] : ["review", "publish"];
  const out: ReportTask[] = [];

  const add = (unit: Unit, quarter: Quarter | undefined, items: { status: ReportStatus; ready: boolean }[]) => {
    const c = { ready: 0, review: 0, publish: 0 };
    for (const s of items) {
      if (s.status === "draft" && s.ready) c.ready++;
      else if (s.status === "submitted") c.review++;
      else if (s.status === "approved") c.publish++;
    }
    for (const k of kinds)
      if (c[k] > 0)
        out.push({ unit, quarter, kind: k, count: c[k], href: unit === "RTQ" ? "/rapor-kuartal" : "/rapor" });
  };

  add(
    "TKQ",
    undefined,
    ids
      .filter((id) => unitOf(data, id) === "TKQ")
      .map((id) => ({
        status: getReport(data, id).status,
        ready: finalScore(data.components.TKQ, data.scores[id]) !== null,
      }))
  );

  const rtq = ids.filter((id) => unitOf(data, id) === "RTQ");
  for (const q of [1, 2, 3] as Quarter[]) {
    const items = rtq.flatMap((id) => {
      const r = data.rtqReports[rtqKey(id, data.academic.year, q)];
      return r ? [{ status: r.status, ready: reportProblems(r).length === 0 }] : [];
    });
    add("RTQ", q, items);
  }
  return out;
}

export function taskText(t: ReportTask): string {
  const what = `${t.count} rapor ${t.unit}${t.quarter ? ` Kuartal ${t.quarter}` : ""}`;
  if (t.kind === "ready") return `${what} siap diajukan`;
  if (t.kind === "review") return `${what} menunggu persetujuan Anda`;
  return `${what} sudah disetujui, siap dipublikasikan`;
}

export function todayCounts(data: AppData, ids: string[], today: string) {
  const set = new Set(ids);
  const rec = data.attendance.filter((a) => set.has(a.studentId) && a.date === today);
  const n = (...s: string[]) => rec.filter((a) => s.includes(a.status)).length;
  return { hadir: n("Hadir", "Terlambat"), izinSakit: n("Izin", "Sakit"), filled: rec.length };
}

// Daftar "perlu dikerjakan". Dipakai dashboard dan lonceng di header supaya angkanya sama.
export function buildTasks(data: AppData, user: User, ids: string[], today: string) {
  const tasks: { href: string; text: string }[] = [];
  if (user.role === "direktur" || user.role === "wali") return tasks;
  for (const m of missingAttendance(data, user, today)) {
    const g = data.groups[m.groupId];
    tasks.push({ href: "/absensi", text: `Absensi hari ini belum diisi: ${g.unit} ${g.name} (${m.missing} dari ${m.total} peserta)` });
  }
  if (user.role === "pendidik") {
    const inc = incompleteScores(data, ids.filter((id) => unitOf(data, id) === "TKQ"));
    if (inc) tasks.push({ href: "/nilai", text: `${inc} peserta nilainya belum lengkap` });
  }
  for (const t of reportTasks(data, user, ids)) tasks.push({ href: t.href, text: taskText(t) });
  if (user.role === "kepala") {
    const n = data.incidents.filter(
      (i) => i.status === "Baru" && ids.includes(i.studentId) && canViewIncident(data, user, i)
    ).length;
    if (n) tasks.push({ href: "/kejadian", text: `${n} catatan kejadian baru belum ditindaklanjuti` });
  }
  return tasks;
}