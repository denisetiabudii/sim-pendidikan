"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { canViewIncident, myStudentIds } from "@/lib/access";
import { groupIds, sortGroups } from "@/lib/groupBy";
import { notify } from "@/lib/toast";
import type { Incident, IncidentStatus } from "@/lib/types";
import Modal from "@/components/Modal";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";
import DayGroups from "@/components/DayGroups";
import RangeBar from "@/components/RangeBar";
import { useHistoryRange } from "@/lib/useHistoryRange";
import { Field, FormGroup } from "@/components/FormSection";

const STATUSES: IncidentStatus[] = ["Baru", "Ditindaklanjuti", "Selesai"];
const STATUS_BADGE: Record<IncidentStatus, string> = { Baru: "badge-warn", Ditindaklanjuti: "badge-accent", Selesai: "badge-ok" };
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function IncidentForm({ students, onClose }: { students: { id: string; name: string }[]; onClose: () => void }) {
  const { data, addIncident } = useStore();
  const [sid, setSid] = useState(students[0]?.id ?? "");
  const [category, setCategory] = useState(data.incidentCategories[0]?.name ?? "");
  const [when, setWhen] = useState("");
  const [location, setLocation] = useState("");
  const [chronology, setChronology] = useState("");
  const [action, setAction] = useState("");

  return (
    <Modal
      size="lg"
      title="Catat kejadian"
      onClose={onClose}
      dirty={!!(chronology || action || location || when)}
      saveLabel="Simpan catatan"
      onSave={() => {
        const r = addIncident({ studentId: sid, category, occurredAt: when, location, chronology, initialAction: action });
        if (r.ok) {
          if (data.incidentCategories.find((c) => c.name === category)?.level === "sensitif")
            notify("info", "Catatan sensitif hanya dapat dibuka PIC unit dan direktur.");
          onClose();
        }
      }}
    >
      <div className="space-y-3">
        <FormGroup step={1} title="Siapa, kapan, dan di mana">
          <Field label="Peserta">
            <select className="w-full" value={sid} onChange={(e) => setSid(e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Waktu kejadian (kosong = sekarang)">
            <input type="datetime-local" className="w-full" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Lokasi">
            <input className="w-full" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </FormGroup>
        <FormGroup step={2} title="Apa yang terjadi" hint="Tulis fakta yang terlihat atau terdengar, tanpa label atau diagnosis. Gunakan bahasa yang menjaga martabat anak.">
          <Field label="Kategori" wide>
            <select className="w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
              {data.incidentCategories.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.level})</option>)}
            </select>
          </Field>
          <Field label="Kronologi" wide>
            <textarea className="w-full" rows={4} maxLength={2000} value={chronology} onChange={(e) => setChronology(e.target.value)} />
          </Field>
          <Field label="Tindakan awal" wide>
            <textarea className="w-full" rows={2} maxLength={2000} value={action} onChange={(e) => setAction(e.target.value)} />
          </Field>
        </FormGroup>
      </div>
    </Modal>
  );
}

function IncidentView({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, updateIncident } = useStore();
  const user = useUser();
  const i = data.incidents.find((x) => x.id === id) as Incident;
  const s = data.students[i.studentId];
  const isHead = user.role === "kepala" && user.unit === data.groups[s.groupId].unit;
  const [status, setStatus] = useState<IncidentStatus>(i.status);
  const [fu, setFu] = useState(i.followUp);

  return (
    <Modal
      size="lg"
      title={`Kejadian: ${s.name}`}
      subtitle={`${i.category}${i.level === "sensitif" ? " · sensitif" : ""} · ${fmt(i.occurredAt)}`}
      cancelLabel={isHead ? "Batal" : "Tutup"}
      onClose={onClose}
      dirty={isHead && (status !== i.status || fu !== i.followUp)}
      saveLabel="Simpan"
      onSave={isHead ? () => { if (updateIncident(id, status, fu).ok) onClose(); } : undefined}
    >
      <div className="card space-y-3 p-4 text-sm">
        <p className="text-slate-500">Dicatat {data.users[i.authorId]?.name} · Lokasi: {i.location || "-"}</p>
        <div><div className="text-xs font-medium text-slate-600">Kronologi</div><p className="whitespace-pre-wrap">{i.chronology}</p></div>
        <div><div className="text-xs font-medium text-slate-600">Tindakan awal</div><p className="whitespace-pre-wrap">{i.initialAction || "-"}</p></div>
        {!isHead && (
          <div>
            <div className="text-xs font-medium text-slate-600">Tindak lanjut · <span className={`badge ${STATUS_BADGE[i.status]}`}>{i.status}</span></div>
            <p className="whitespace-pre-wrap">{i.followUp || "belum ada"}</p>
          </div>
        )}
        {isHead && (
          <div className="grid gap-3 border-t pt-3 sm:grid-cols-3">
            <Field label="Status">
              <select className="w-full" value={status} onChange={(e) => setStatus(e.target.value as IncidentStatus)}>
                {STATUSES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Tindak lanjut">
                <textarea className="w-full" rows={3} maxLength={2000} value={fu} onChange={(e) => setFu(e.target.value)} />
              </Field>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function IncidentRow({ i, onOpen }: { i: Incident; onOpen: () => void }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm ${i.level === "sensitif" ? "border-l-4 border-l-red-500" : ""}`}>
      <span className="badge">{i.category}</span>
      {i.level === "sensitif" && <span className="badge badge-bad">sensitif</span>}
      <span className={`badge ${STATUS_BADGE[i.status]}`}>{i.status}</span>
      <span className="text-xs text-slate-500">{fmt(i.occurredAt)}{i.location ? ` · ${i.location}` : ""}</span>
      <button className="ml-auto rounded-lg border px-3 py-1" onClick={onOpen}>Buka</button>
    </div>
  );
}

export default function Kejadian() {
  const { data, openIncident } = useStore();
  const user = useUser();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const h = useHistoryRange();

  const scopeIds = myStudentIds(data, user);
  const canCreate = user.role === "pendidik" || user.role === "kepala";
  const visible = data.incidents.filter((i) => canViewIncident(data, user, i));
  const hidden = user.role === "pendidik"
    ? data.incidents.filter((i) => scopeIds.includes(i.studentId) && !canViewIncident(data, user, i)).length
    : 0;

  // Kejadian yang belum selesai selalu tampil, yang selesai mengikuti rentang waktu.
  const inWindow = visible.filter((i) => i.status !== "Selesai" || h.keep(i.occurredAt));
  const byStudent = new Map<string, Incident[]>();
  for (const i of inWindow) byStudent.set(i.studentId, [...(byStudent.get(i.studentId) ?? []), i]);
  const needle = q.trim().toLowerCase();
  const withInc = [...byStudent.keys()];
  const shown = withInc.filter((id) => !needle || data.students[id].name.toLowerCase().includes(needle));
  const forceOpen = needle !== "";
  const all = groupIds(data, withInc);
  const vis = groupIds(data, shown);
  const keys = sortGroups(data, forceOpen ? vis.keys() : all.keys());
  const acc: AccGroup[] = keys.map((gid) => {
    const list = (all.get(gid) ?? []).flatMap((id) => byStudent.get(id) ?? []);
    const n = (s: IncidentStatus) => list.filter((i) => i.status === s).length;
    return {
      id: gid, title: data.groups[gid].name, total: (all.get(gid) ?? []).length,
      chips: [
        { label: "baru", n: n("Baru"), cls: "badge-warn" },
        { label: "ditindaklanjuti", n: n("Ditindaklanjuti"), cls: "badge-accent" },
        { label: "selesai", n: n("Selesai"), cls: "badge-ok" },
        { label: "sensitif", n: list.filter((i) => i.level === "sensitif").length, cls: "badge-bad" },
      ],
    };
  });

  function open(id: string) {
    if (openIncident(id).ok) setView(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Buku kejadian</h1>
        {canCreate && <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => setForm(true)}>Catat kejadian</button>}
      </div>
      {hidden > 0 && <p className="text-sm text-slate-600">{hidden} catatan sensitif hanya dapat dibuka PIC unit dan direktur.</p>}

      <div className="card p-3">
        <input className="w-full" placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama" />
      </div>
      <div className="card p-3">
        <RangeBar h={h} shown={inWindow.length} total={visible.length} noun="kejadian" note="Yang belum selesai selalu tampil." />
      </div>

      <GroupAccordion
        groups={acc}
        forceOpen={forceOpen}
        noun="peserta bercatatan"
        render={(gid) => (
          <div className="divide-y">
            {(vis.get(gid) ?? []).map((sid) => (
              <div key={sid} className="space-y-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{data.students[sid].name}</span>
                  <span className="badge">{byStudent.get(sid)?.length ?? 0} catatan</span>
                </div>
                <DayGroups
                  items={byStudent.get(sid) ?? []}
                  getIso={(i) => i.occurredAt}
                  render={(i) => <IncidentRow key={i.id} i={i} onOpen={() => open(i.id)} />}
                />
              </div>
            ))}
          </div>
        )}
      />
      {acc.length === 0 && (
        <p className="card p-4 text-sm text-slate-500">
          {withInc.length === 0 ? "Belum ada catatan kejadian dalam cakupan Anda." : "Tidak ada nama yang cocok."}
        </p>
      )}
      <p className="text-xs text-slate-500">
        Orang tua tidak melihat buku kejadian secara otomatis. Pembukaan dan perubahan catatan sensitif tercatat di audit log.
      </p>

      {form && <IncidentForm students={scopeIds.map((id) => data.students[id])} onClose={() => setForm(false)} />}
      {view && <IncidentView key={view} id={view} onClose={() => setView(null)} />}
    </div>
  );
}