import { canViewIncident, myGroupIds } from "./access";
import { finalScore } from "./grades";
import { getReport } from "./reports";
import type { AppData, User } from "./types";

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