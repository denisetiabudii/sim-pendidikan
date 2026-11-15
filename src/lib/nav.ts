import type { Role } from "./types";

export interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

// Tambah menu baru di sini setiap ada modul baru.
export const NAV: NavItem[] = [
  { href: "/", label: "Ringkasan", roles: ["direktur", "kepala", "pendidik", "wali"] },
  { href: "/absensi", label: "Absensi", roles: ["kepala", "pendidik"] },
  { href: "/nilai", label: "Nilai", roles: ["kepala", "pendidik"] },
    { href: "/setoran", label: "Setoran", roles: ["kepala", "pendidik", "wali"] },
    { href: "/buku-penghubung", label: "Buku penghubung", roles: ["kepala", "pendidik", "wali"] },
      { href: "/kejadian", label: "Kejadian", roles: ["direktur", "kepala", "pendidik"] },
  { href: "/penugasan", label: "Penugasan", roles: ["direktur", "kepala"] },
    { href: "/impor", label: "Impor", roles: ["direktur", "kepala"] },
  { href: "/rapor", label: "Rapor", roles: ["direktur", "kepala", "pendidik", "wali"] },
    { href: "/pengaturan", label: "Pengaturan", roles: ["direktur", "kepala"] },
  { href: "/audit", label: "Audit", roles: ["direktur"] },
];

export const navFor = (role: Role) => NAV.filter((n) => n.roles.includes(role));

const matches = (path: string, href: string) =>
  path === href || (href !== "/" && path.startsWith(href + "/"));

export const canOpen = (role: Role, path: string) =>
  NAV.some((n) => matches(path, n.href) && n.roles.includes(role));

export const isActive = matches;