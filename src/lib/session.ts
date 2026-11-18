import { educatorUnit } from "./access";
import type { AppData, Unit, User } from "./types";

export type Entry = "direktur" | "TKQ:pic" | "TKQ:guru" | "RTQ:pic" | "RTQ:guru";

export const entryUnit = (e: Entry): Unit | undefined =>
  e === "direktur" ? undefined : (e.split(":")[0] as Unit);

// Hanya untuk prototipe. Login sungguhan dibuat di backend.
export const DEMO_PASSWORD = "demo";

// Akun wali tidak punya pintu masuk (aplikasi internal dulu).
export function eligible(data: AppData, u: User, entry: Entry): boolean {
  if (entry === "direktur") return u.role === "direktur";
  const [unit, kind] = entry.split(":");
  if (kind === "pic") return u.role === "kepala" && u.unit === unit;
  return u.role === "pendidik" && educatorUnit(data, u) === unit;
}

export function findByUsername(data: AppData, username: string): User | undefined {
  const k = username.trim().toLowerCase();
  if (!k) return undefined;
  return Object.values(data.users).find((u) => u.username?.toLowerCase() === k);
}