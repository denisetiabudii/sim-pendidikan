import type { Role, Unit } from "./types";

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
  units?: Unit[]; // bila diisi, hanya tampil untuk unit ini
  labels?: Partial<Record<Unit, string>>; // label khusus per unit
  generic?: string; // label untuk peran tanpa unit (direktur, wali)
}

const ALL: Role[] = ["direktur", "kepala", "pendidik", "wali"];

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", roles: ALL },
  { href: "/absensi", label: "Absensi", labels: { TKQ: "Absensi Siswa", RTQ: "Absensi Santri" }, roles: ["kepala", "pendidik"] },
  { href: "/nilai", label: "Penilaian", generic: "Penilaian (TKQ)", roles: ["kepala", "pendidik"], units: ["TKQ"] },
  { href: "/setoran", label: "Tahfidz & Murojaah", generic: "Tahfidz (RTQ)", roles: ["kepala", "pendidik", "wali"], units: ["RTQ"] },
  { href: "/buku-penghubung", label: "Komunikasi", roles: ["kepala", "pendidik", "wali"] },
  { href: "/kejadian", label: "Kejadian", labels: { TKQ: "Kejadian Siswa", RTQ: "Kejadian Santri" }, roles: ["direktur", "kepala", "pendidik"] },
  { href: "/rapor", label: "Raport", generic: "Raport TKQ", roles: ALL, units: ["TKQ"] },
  { href: "/rapor-kuartal", label: "Raport", generic: "Raport RTQ", roles: ALL, units: ["RTQ"] },
  { href: "/penugasan", label: "Penugasan", roles: ["direktur", "kepala"] },
  { href: "/impor", label: "Impor", roles: ["direktur", "kepala"] },
  { href: "/pengaturan", label: "Pengaturan", roles: ["direktur", "kepala"] },
  { href: "/audit", label: "Audit", roles: ["direktur"] },
];

export const labelFor = (n: NavItem, unit?: Unit) =>
  unit ? n.labels?.[unit] ?? n.label : n.generic ?? n.labels?.TKQ?.replace("Siswa", "") ?? n.label;

export const navFor = (role: Role, unit?: Unit) =>
  NAV.filter((n) => n.roles.includes(role) && (!n.units || !unit || n.units.includes(unit)));

const matches = (path: string, href: string) =>
  path === href || (href !== "/" && path.startsWith(href + "/"));

export const canOpen = (role: Role, path: string, unit?: Unit) =>
  navFor(role, unit).some((n) => matches(path, n.href));

export const isActive = matches;