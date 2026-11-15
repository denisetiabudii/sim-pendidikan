"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { canSeeStudent, canViewIncident, myStudentIds } from "@/lib/access";
import type { Incident, IncidentStatus } from "@/lib/types";

const STATUSES: IncidentStatus[] = ["Baru", "Ditindaklanjuti", "Selesai"];
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

export default function Kejadian() {
  const { data, currentUserId, addIncident, openIncident } = useStore();
  const user = data.users[currentUserId];
  const canCreate = user.role === "pendidik" || user.role === "kepala";

  const students = myStudentIds(data, user).map((id) => data.students[id]);
  const [sid, setSid] = useState("");
  const [category, setCategory] = useState("");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [chronology, setChronology] = useState("");
  const [action, setAction] = useState("");
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const studentId = students.some((s) => s.id === sid) ? sid : students[0]?.id;
  const cat = data.incidentCategories.some((c) => c.name === category)
    ? category
    : data.incidentCategories[0]?.name;

  const visible = data.incidents.filter((i) => canViewIncident(data, user, i));
  const hidden =
    user.role === "pendidik"
      ? data.incidents.filter(
          (i) =>
            canSeeStudent(data, user, i.studentId) &&
            !canViewIncident(data, user, i),
        ).length
      : 0;

  function save() {
    if (!studentId || !cat) return;
    const r = addIncident({
      studentId,
      category: cat,
      occurredAt: when,
      location,
      chronology,
      initialAction: action,
    });
    if (r.ok) {
      const sensitive =
        data.incidentCategories.find((c) => c.name === cat)?.level ===
        "sensitif";
      setMsg(
        sensitive
          ? "Tersimpan. Catatan sensitif hanya dapat dibuka kepala unit dan direktur."
          : "Catatan tersimpan.",
      );
      setChronology("");
      setAction("");
      setLocation("");
      setWhen("");
    } else setMsg(r.error);
  }

  function open(id: string) {
    const r = openIncident(id);
    if (r.ok) setOpenId(id);
    else setMsg(r.error);
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Buku kejadian</h1>

      {canCreate && (
        <section className="mb-4 rounded border bg-white p-3">
          <h2 className="mb-2 font-semibold">Catat kejadian</h2>
          <div className="mb-2 flex flex-wrap gap-2">
            <select
              className="rounded border bg-white p-2 text-sm"
              value={studentId ?? ""}
              onChange={(e) => setSid(e.target.value)}
              aria-label="Peserta"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="rounded border bg-white p-2 text-sm"
              value={cat ?? ""}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Kategori"
            >
              {data.incidentCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.level})
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="rounded border p-2 text-sm"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              aria-label="Waktu kejadian"
            />
            <input
              className="rounded border p-2 text-sm"
              placeholder="Lokasi"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={3}
            maxLength={2000}
            placeholder="Kronologi faktual: apa yang terlihat atau terdengar, tanpa label atau diagnosis"
            value={chronology}
            onChange={(e) => setChronology(e.target.value)}
          />
          <textarea
            className="mt-2 w-full rounded border p-2 text-sm"
            rows={2}
            maxLength={2000}
            placeholder="Tindakan awal"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <button
            className="mt-2 rounded bg-teal-700 px-3 py-2 text-sm text-white"
            onClick={save}
          >
            Simpan catatan
          </button>
          <p className="mt-1 text-xs text-slate-500">
            Kosongkan waktu untuk memakai waktu sekarang. Gunakan bahasa yang
            menjaga martabat anak.
          </p>
        </section>
      )}

      {msg && <p className="mb-3 text-sm">{msg}</p>}
      {hidden > 0 && (
        <p className="mb-3 text-sm text-slate-600">
          {hidden} catatan sensitif hanya dapat dibuka kepala unit dan direktur.
        </p>
      )}

      <div className="space-y-3">
        {visible.map((i) => (
          <IncidentCard
            key={i.id}
            incident={i}
            expanded={openId === i.id}
            onOpen={() => open(i.id)}
            onClose={() => setOpenId(null)}
          />
        ))}
        {visible.length === 0 && (
          <p className="rounded border bg-white p-3 text-sm text-slate-500">
            Belum ada catatan kejadian dalam cakupan Anda.
          </p>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-500">
        Orang tua tidak melihat buku kejadian secara otomatis. Pembukaan dan
        perubahan catatan sensitif tercatat di audit log.
      </p>
    </div>
  );
}

function IncidentCard({
  incident: i,
  expanded,
  onOpen,
  onClose,
}: {
  incident: Incident;
  expanded: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { data, currentUserId, updateIncident } = useStore();
  const user = data.users[currentUserId];
  const student = data.students[i.studentId];
  const unit = data.groups[student.groupId].unit;
  const isHead = user.role === "kepala" && user.unit === unit;

  const [status, setStatus] = useState<IncidentStatus>(i.status);
  const [followUp, setFollowUp] = useState(i.followUp);
  const [err, setErr] = useState("");

  function save() {
    const r = updateIncident(i.id, status, followUp);
    setErr(r.ok ? "" : r.error);
  }

  return (
    <article
      className={`rounded border bg-white p-3 ${i.level === "sensitif" ? "border-l-4 border-l-red-600" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <b>{student.name}</b>
        <span className="rounded-full border px-2 py-0.5 text-xs">{unit}</span>
        <span className="rounded-full border px-2 py-0.5 text-xs">
          {i.category}
        </span>
        {i.level === "sensitif" && (
          <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs text-red-800">
            sensitif
          </span>
        )}
        <span className="rounded-full border px-2 py-0.5 text-xs">
          {i.status}
        </span>
        <span className="ml-auto text-xs text-slate-500">
          {fmt(i.occurredAt)}
        </span>
      </div>

      {!expanded ? (
        <button
          className="mt-2 rounded border px-2.5 py-1 text-sm"
          onClick={onOpen}
        >
          Buka
        </button>
      ) : (
        <div className="mt-2 text-sm">
          <p className="text-slate-500">
            Dicatat {data.users[i.authorId]?.name} · Lokasi: {i.location || "-"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            <b>Kronologi:</b> {i.chronology}
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            <b>Tindakan awal:</b> {i.initialAction || "-"}
          </p>
          <p className="mt-1 whitespace-pre-wrap">
            <b>Tindak lanjut:</b> {i.followUp || "belum ada"}
          </p>

          {isHead && (
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="rounded border bg-white p-1.5"
                value={status}
                onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                aria-label="Status"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <input
                className="min-w-48 flex-1 rounded border p-1.5"
                placeholder="Tindak lanjut"
                maxLength={2000}
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
              />
              <button
                className="rounded bg-teal-700 px-3 py-1.5 text-white"
                onClick={save}
              >
                Simpan
              </button>
            </div>
          )}
          {err && <p className="mt-1 text-red-700">{err}</p>}

          <button className="mt-2 rounded border px-2.5 py-1" onClick={onClose}>
            Tutup
          </button>
        </div>
      )}
    </article>
  );
}
