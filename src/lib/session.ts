import { educatorUnit } from "./access";
import type { AppData, Unit, User } from "./types";

export type Entry = Unit | "wali" | "direktur";

// Hanya untuk prototipe. Login sungguhan dibuat di backend.
export const DEMO_PASSWORD = "demo";

// Apakah akun ini boleh masuk lewat pintu (unit) yang dipilih.
export function eligible(data: AppData, u: User, entry: Entry): boolean {
  if (entry === "wali") return u.role === "wali";
  if (entry === "direktur") return u.role === "direktur";
  if (u.role === "kepala") return u.unit === entry;
  if (u.role === "pendidik") return educatorUnit(data, u) === entry;
  return false;
}

export function findByUsername(data: AppData, username: string): User | undefined {
  const k = username.trim().toLowerCase();
  if (!k) return undefined;
  return Object.values(data.users).find((u) => u.username?.toLowerCase() === k);
}