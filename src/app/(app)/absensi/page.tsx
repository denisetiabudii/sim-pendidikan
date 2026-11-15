"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { myGroupIds, myStudentIds } from "@/lib/access";
import { STATUSES } from "@/lib/constants";
import type { AttendanceStatus } from "@/lib/types";
import { useToday } from "@/lib/useToday";

export default function Absensi() {
  const { data, currentUserId, recordAttendance } = useStore();
  const user = data.users[currentUserId];

  const groups = myGroupIds(data, user);
  const [groupId, setGroupId] = useState("");
    const today = useToday();
  const [pickedDate, setPickedDate] = useState("");
  const date = pickedDate || today;
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [msg, setMsg] = useState("");

  // Jika pengguna berganti peran, kelompok lama bisa tidak valid.
  const gid = groups.includes(groupId) ? groupId : groups[0];
  const students = myStudentIds(data, user)
    .map((id) => data.students[id])
    .filter((s) => s.groupId === gid);

  function save(studentId: string) {
    if (!date) return;
    const existing = data.attendance.find(
      (a) => a.studentId === studentId && a.groupId === gid && a.date === date
    );
    const status = draft[studentId] ?? existing?.status ?? "Hadir";
    let reason: string | undefined;
    if (existing) {
      reason = prompt("Alasan koreksi absensi:") ?? "";
    }
    const r = recordAttendance(studentId, date, status, reason);
    setMsg(r.ok ? "Tersimpan" : r.error);
  }

    function markAll() {
    if (!date) return;
    let n = 0;
    for (const s of students) {
      const has = data.attendance.some((a) => a.studentId === s.id && a.groupId === gid && a.date === date);
      if (!has && recordAttendance(s.id, date, "Hadir").ok) n++;
    }
    setMsg(n ? `${n} peserta ditandai Hadir.` : "Semua peserta sudah terisi.");
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Absensi</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          className="rounded border bg-white p-2"
          value={gid}
          onChange={(e) => setGroupId(e.target.value)}
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {data.groups[g].unit} – {data.groups[g].name}
            </option>
          ))}
        </select>
                <input
          type="date"
          className="rounded border bg-white p-2"
          value={date}
          onChange={(e) => setPickedDate(e.target.value)}
        />
                {(user.role === "pendidik" || user.role === "kepala") && (
          <button className="rounded border bg-white px-3 py-2 text-sm" onClick={markAll}>
            Hadirkan semua yang belum diisi
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="p-2">Nama</th>
              <th className="p-2">Tercatat</th>
              <th className="p-2">Status</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const rec = data.attendance.find(
                (a) => a.studentId === s.id && a.groupId === gid && a.date === date
              );
              return (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.name}</td>
                  <td className="p-2">{rec?.status ?? <span className="text-slate-400">belum diisi</span>}</td>
                  <td className="p-2">
                    <select
                      className="rounded border p-1.5"
                      value={draft[s.id] ?? rec?.status ?? "Hadir"}
                      onChange={(e) =>
                        setDraft({ ...draft, [s.id]: e.target.value as AttendanceStatus })
                      }
                    >
                      {STATUSES.map((st) => (
                        <option key={st}>{st}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <button
                      className="rounded bg-teal-700 px-3 py-1.5 text-white"
                      onClick={() => save(s.id)}
                    >
                      {rec ? "Koreksi" : "Simpan"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {msg && <p className="mt-3 text-sm">{msg}</p>}
      <p className="mt-2 text-sm text-slate-500">
        Satu catatan per peserta, kelompok, dan tanggal. Koreksi wajib disertai alasan.
      </p>
    </div>
  );
}