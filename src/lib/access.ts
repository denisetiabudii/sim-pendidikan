import type { AppData, Incident, Unit, User } from "./types";

export function myGroupIds(data: AppData, user: User): string[] {
  const all = Object.keys(data.groups);
  switch (user.role) {
    case "direktur":
      return all;
    case "kepala":
      return all.filter((g) => data.groups[g].unit === user.unit);
    case "pendidik":
      return user.groupIds ?? [];
    default:
      return [];
  }
}

export function myStudentIds(data: AppData, user: User): string[] {
  if (user.role === "wali") return user.childIds ?? [];
  const groups = myGroupIds(data, user);
  return Object.values(data.students)
    .filter((s) => groups.includes(s.groupId))
    .map((s) => s.id);
}

export const canSeeStudent = (data: AppData, user: User, studentId: string) =>
  myStudentIds(data, user).includes(studentId);

export const canEditGroup = (data: AppData, user: User, groupId: string) =>
  (user.role === "pendidik" || user.role === "kepala") &&
  myGroupIds(data, user).includes(groupId);

  // Unit tempat pendidik bertugas: dari field unit, atau dari kelompok pertamanya.
export function educatorUnit(data: AppData, user: User): Unit | undefined {
  if (user.unit) return user.unit;
  const g = user.groupIds?.[0];
  return g ? data.groups[g].unit : undefined;
}

export function canViewIncident(data: AppData, user: User, inc: Incident): boolean {
  const student = data.students[inc.studentId];
  if (!student) return false;
  const unit = data.groups[student.groupId].unit;

  if (user.role === "direktur") return true;
  if (user.role === "kepala") return user.unit === unit;
  if (user.role === "pendidik")
    return (
      inc.level === "biasa" &&
      canSeeStudent(data, user, inc.studentId) &&
      canEditGroup(data, user, student.groupId)
    );
  return false; // wali dan peran lain tidak pernah melihat buku kejadian
}