import type { AppData } from "./types";

export function groupIds(data: AppData, ids: string[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const id of ids) {
    const g = data.students[id].groupId;
    const l = m.get(g);
    if (l) l.push(id);
    else m.set(g, [id]);
  }
  return m;
}

export const sortGroups = (data: AppData, keys: Iterable<string>) =>
  [...keys].sort((a, b) => data.groups[a].name.localeCompare(data.groups[b].name));