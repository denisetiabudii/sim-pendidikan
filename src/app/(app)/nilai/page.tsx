"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { myGroupIds, myStudentIds } from "@/lib/access";
import { finalScore, isScoreLocked, predicate, weightsTotal } from "@/lib/grades";

export default function Nilai() {
  const { data, currentUserId, setScore } = useStore();
  const user = data.users[currentUserId];
  const groups = myGroupIds(data, user);
  const [groupId, setGroupId] = useState("");
  const [msg, setMsg] = useState("");

  const gid = groups.includes(groupId) ? groupId : groups[0];
  const unit = data.groups[gid].unit;
  const components = data.components[unit];
  const total = weightsTotal(components);
  const canEdit = user.role === "pendidik";
  const students = myStudentIds(data, user)
    .map((id) => data.students[id])
    .filter((s) => s.groupId === gid);

  function commit(studentId: string, component: string, raw: string) {
    const value = raw.trim() === "" ? null : Number(raw);
    const r = setScore(studentId, component, value);
    setMsg(r.ok ? "" : r.error);
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Nilai</h1>

      <select
        className="mb-3 rounded border bg-white p-2"
        value={gid}
        onChange={(e) => setGroupId(e.target.value)}
      >
        {groups.map((g) => (
          <option key={g} value={g}>
            {data.groups[g].unit} – {data.groups[g].name}
          </option>
        ))}
      </select>

      {total !== 100 && (
        <p className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          Total bobot {unit} adalah {total}%, harus 100%. Nilai akhir tidak dihitung sampai diperbaiki.
        </p>
      )}

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="p-2">Nama</th>
              {components.map((c) => (
                <th key={c.name} className="p-2">
                  {c.name} ({c.weight}%)
                </th>
              ))}
              <th className="p-2">Akhir</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const scores = data.scores[s.id];
              const fin = finalScore(components, scores);
              const locked = isScoreLocked(data, s.id);
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.name}</td>
                  {components.map((c) => {
                    const v = scores?.[c.name];
                    return (
                      <td key={c.name} className="p-2">
                        <input
                          key={`${s.id}-${c.name}-${v ?? ""}`}
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={v ?? ""}
                          disabled={!canEdit || locked}
                          aria-label={`${c.name} ${s.name}`}
                          className="w-20 rounded border p-1.5 disabled:bg-slate-100"
                          onBlur={(e) => {
                            if (e.target.value !== String(v ?? ""))
                              commit(s.id, c.name, e.target.value);
                          }}
                        />
                      </td>
                    );
                  })}
                  <td className="p-2">
                    <b>{fin ?? "–"}</b>
                    <div className="text-xs text-slate-500">{predicate(fin)}</div>
                    {locked && <div className="text-xs text-amber-700">terkunci</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
      <p className="mt-2 text-sm text-slate-500">
        Nilai tersimpan saat kolom ditinggalkan. Bobot dan predikat masih contoh sampai formula
        resmi disahkan.
      </p>
    </div>
  );
}