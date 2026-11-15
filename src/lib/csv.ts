import { myGroupIds } from "./access";
import type { AppData, ImportBatch, User } from "./types";

export const MAX_ROWS = 500;

// Pembaca CSV sederhana: mengenali tanda kutip ganda, BOM, dan pemisah koma, titik koma, atau tab.
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
    const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (c: string) => firstLine.split(c).length - 1;
  const delimiter = [",", ";", "\t"].reduce((best, c) => (count(c) > count(best) ? c : best), ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface PreviewRow {
  line: number;
  name: string;
  groupName: string;
  groupId?: string;
  error?: string;
}

export function validateRows(data: AppData, user: User, raw: string[][]): PreviewRow[] {
  const rows = raw.map((r) => r.map((c) => c.trim()));
  if (rows[0]?.[0]?.toLowerCase() === "nama") rows.shift();

  const scope = myGroupIds(data, user).map((id) => data.groups[id]);
  const seen = new Set<string>();

  return rows.map((r, idx) => {
    const [name = "", groupName = "", unitName = ""] = r;
    const out: PreviewRow = { line: idx + 1, name, groupName };

    if (!name) return { ...out, error: "Nama kosong" };
        if (!groupName && /[;,]/.test(name))
      return { ...out, error: "Pemisah kolom tidak sama dengan baris judul" };
    if (name.length > 100) return { ...out, error: "Nama lebih dari 100 karakter" };
        if (!groupName)
      return { ...out, error: "Kolom kelompok kosong. Pisahkan nama dan kelompok dengan koma, titik koma, atau tab" };

    const found = scope.filter(
      (g) =>
        g.name.toLowerCase() === groupName.toLowerCase() &&
        (!unitName || g.unit.toLowerCase() === unitName.toLowerCase())
    );
    if (found.length === 0) return { ...out, error: "Kelompok tidak ditemukan di cakupan Anda" };
    if (found.length > 1)
      return { ...out, error: "Nama kelompok ada di lebih dari satu unit, tambahkan kolom unit" };

    const g = found[0];
    const key = `${g.id}|${name.toLowerCase()}`;
    const exists = Object.values(data.students).some(
      (s) => s.groupId === g.id && s.name.toLowerCase() === name.toLowerCase()
    );
    if (exists || seen.has(key)) return { ...out, error: "Duplikat di kelompok yang sama" };
    seen.add(key);

    return { ...out, groupId: g.id };
  });
}

// true bila ada peserta hasil impor ini yang sudah punya data akademik.
export function importBatchInUse(data: AppData, batch: ImportBatch): boolean {
  const ids = new Set(batch.studentIds);
  return (
    data.attendance.some((a) => ids.has(a.studentId)) ||
    batch.studentIds.some((id) => data.scores[id] || data.reports[id]) ||
    data.notes.some((n) => ids.has(n.studentId)) ||
    data.incidents.some((i) => ids.has(i.studentId))
  );
}