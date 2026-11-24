"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { canEditGroup, myGroupIds, myStudentIds } from "@/lib/access";
import { STATUSES } from "@/lib/constants";
import { groupIds } from "@/lib/groupBy";
import type { AttendanceStatus } from "@/lib/types";
import Modal from "@/components/Modal";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";

const BADGE: Record<AttendanceStatus, string> = {
  Hadir: "badge-ok", Terlambat: "badge-warn", Izin: "badge-accent", Sakit: "badge-accent", Alpa: "badge-bad",
};

function CorrectionDialog({
  name, from, to, onCancel, onConfirm,
}: { name: string; from: AttendanceStatus; to: AttendanceStatus; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      size="sm"
      title="Koreksi absensi"
      subtitle={name}
      onClose={onCancel}
      dirty={reason.trim().length > 0}
      saveLabel="Simpan koreksi"
      saveDisabled={!reason.trim()}
      onSave={() => onConfirm(reason.trim())}
    >
      <p className="mb-2 text-sm">Status berubah dari <b>{from}</b> menjadi <b>{to}</b>. Tulis alasan koreksi:</p>
      <textarea className="w-full" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Alasan koreksi" autoFocus />
    </Modal>
  );
}

export default function Absensi() {
  const { data, recordAttendance } = useStore();
  const user = useUser();
  const today = useToday();
  const [pickedDate, setPickedDate] = useState("");
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [fix, setFix] = useState<{ id: string; gid: string; from: AttendanceStatus; to: AttendanceStatus } | null>(null);
  const date = pickedDate || today;

  const ids = myStudentIds(data, user);
  const needle = q.trim().toLowerCase();
  const shown = ids.filter((id) => !needle || data.students[id].name.toLowerCase().includes(needle));
  const forceOpen = needle !== "";
  const all = groupIds(data, ids);
  const vis = groupIds(data, shown);
  const keys = (forceOpen ? [...vis.keys()] : myGroupIds(data, user)).filter((g) => all.has(g));
  const rec = (id: string, gid: string) => data.attendance.find((a) => a.studentId === id && a.groupId === gid && a.date === date);
  const canEdit = (gid: string) => (user.role === "pendidik" || user.role === "kepala") && canEditGroup(data, user, gid);

  const acc: AccGroup[] = keys.map((gid) => {
    const list = all.get(gid) ?? [];
    const st = list.map((id) => rec(id, gid)?.status);
    const n = (...s: AttendanceStatus[]) => st.filter((x) => x && s.includes(x)).length;
    return {
      id: gid, title: `${data.groups[gid].unit} · ${data.groups[gid].name}`, total: list.length,
      chips: [
        { label: "belum diisi", n: st.filter((x) => !x).length, cls: "badge-warn" },
        { label: "hadir", n: n("Hadir", "Terlambat"), cls: "badge-ok" },
        { label: "izin/sakit", n: n("Izin", "Sakit"), cls: "badge-accent" },
        { label: "alpa", n: n("Alpa"), cls: "badge-bad" },
      ],
    };
  });

  function markAll(gid: string) {
    for (const id of all.get(gid) ?? []) if (!rec(id, gid)) recordAttendance(id, date, "Hadir");
  }
  function save(id: string, gid: string) {
    const r = rec(id, gid);
    const to = draft[id] ?? r?.status ?? "Hadir";
    if (!r) {
      if (recordAttendance(id, date, to).ok) setDraft((d) => { const n = { ...d }; delete n[id]; return n; });
    } else if (r.status !== to) setFix({ id, gid, from: r.status, to });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Absensi</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Tanggal
          <input type="date" value={date} onChange={(e) => setPickedDate(e.target.value)} />
        </label>
      </div>

      <div className="card p-3">
        <input className="w-full" placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama" />
      </div>

      <GroupAccordion
        groups={acc}
        forceOpen={forceOpen}
        noun="peserta"
        render={(gid) => (
          <div>
            {canEdit(gid) && (
              <div className="flex justify-end border-b px-4 py-2">
                <button className="rounded-lg border px-3 py-1.5 text-sm" disabled={!date} onClick={() => markAll(gid)}>
                  Hadirkan semua yang belum diisi
                </button>
              </div>
            )}
            <ul className="divide-y">
              {(vis.get(gid) ?? []).map((id) => {
                const r = rec(id, gid);
                return (
                  <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="min-w-40 flex-1 font-medium">{data.students[id].name}</div>
                    {r ? <span className={`badge ${BADGE[r.status]}`}>{r.status}</span> : <span className="badge badge-warn">belum diisi</span>}
                    {canEdit(gid) && (
                      <div className="flex gap-2">
                        <select
                          aria-label={`Status ${data.students[id].name}`}
                          value={draft[id] ?? r?.status ?? "Hadir"}
                          onChange={(e) => setDraft({ ...draft, [id]: e.target.value as AttendanceStatus })}
                        >
                          {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <button
                          className={`rounded-lg px-3 py-1.5 text-sm ${r ? "border" : "bg-accent text-white"}`}
                          disabled={!date}
                          onClick={() => save(id, gid)}
                        >
                          {r ? "Koreksi" : "Simpan"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      />
      {acc.length === 0 && <p className="card p-4 text-sm text-slate-500">Tidak ada peserta yang cocok.</p>}
      <p className="text-xs text-slate-500">Satu catatan per peserta, kelompok, dan tanggal. Koreksi wajib disertai alasan.</p>

      {fix && (
        <CorrectionDialog
          name={data.students[fix.id].name}
          from={fix.from}
          to={fix.to}
          onCancel={() => setFix(null)}
          onConfirm={(reason) => {
            if (recordAttendance(fix.id, date, fix.to, reason).ok) {
              setDraft((d) => { const n = { ...d }; delete n[fix.id]; return n; });
              setFix(null);
            }
          }}
        />
      )}
    </div>
  );
}