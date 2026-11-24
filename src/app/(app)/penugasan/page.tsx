"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { educatorUnit } from "@/lib/access";
import Modal from "@/components/Modal";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";
import { Field } from "@/components/FormSection";
import type { Unit } from "@/lib/types";

function useScope() {
  const { data } = useStore();
  const user = useUser();
  const units: Unit[] = user.role === "direktur" ? ["TKQ", "RTQ"] : user.unit ? [user.unit] : [];
  const educators = Object.values(data.users).filter((u) => {
    if (u.role !== "pendidik") return false;
    const eu = educatorUnit(data, u);
    return !eu || units.includes(eu);
  });
  return { data, units, educators };
}

function Chip({ label, sub, onRemove }: { label: string; sub?: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-3 pr-2 text-sm">
      {label}
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
      {onRemove && (
        <button className="rounded-full px-1.5 text-red-700 hover:bg-red-50" aria-label={`Cabut ${label}`} onClick={onRemove}>✕</button>
      )}
    </span>
  );
}

function AssignDialog({ mode, id, onClose }: { mode: "group" | "educator"; id: string; onClose: () => void }) {
  const { data, units, educators } = useScope();
  const { assignEducator, unassignEducator } = useStore();
  const [pick, setPick] = useState("");

  let title: string;
  let assigned: { key: string; label: string; sub?: string }[];
  let options: { id: string; label: string }[];
  let add: (v: string) => void;
  let remove: (k: string) => void;

  if (mode === "group") {
    const g = data.groups[id];
    title = `${g.unit} · ${g.name}`;
    assigned = educators
      .filter((e) => e.groupIds?.includes(id))
      .map((e) => ({ key: e.id, label: e.name, sub: e.username ? `@${e.username}` : undefined }));
    options = educators
      .filter((e) => {
        const eu = educatorUnit(data, e);
        return !e.groupIds?.includes(id) && (!eu || eu === g.unit);
      })
      .map((e) => ({ id: e.id, label: e.name }));
    add = (v) => { assignEducator(v, id); };
    remove = (k) => { unassignEducator(k, id); };
  } else {
    const e = data.users[id];
    const eu = educatorUnit(data, e);
    const mine = e.groupIds ?? [];
    title = e.name;
    assigned = mine.map((gid) => ({ key: gid, label: `${data.groups[gid].unit} · ${data.groups[gid].name}` }));
    options = Object.values(data.groups)
      .filter((g) => units.includes(g.unit) && (!eu || eu === g.unit) && !mine.includes(g.id))
      .map((g) => ({ id: g.id, label: `${g.unit} · ${g.name}` }));
    add = (v) => { assignEducator(id, v); };
    remove = (k) => { unassignEducator(id, k); };
  }

  const chosen = options.some((o) => o.id === pick) ? pick : options[0]?.id;

  return (
    <Modal size="sm" title={`Atur penugasan`} subtitle={title} cancelLabel="Selesai" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-sm">Saat ini</h3>
          <div className="flex flex-wrap gap-2">
            {assigned.length === 0 && <span className="text-sm text-slate-500">Belum ada penugasan.</span>}
            {assigned.map((a) => (
              <Chip key={a.key} label={a.label} sub={a.sub} onRemove={() => { if (confirm(`Cabut ${a.label}?`)) remove(a.key); }} />
            ))}
          </div>
        </div>
        {options.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm">Tambah</h3>
            <div className="flex gap-2">
              <select className="min-w-0 flex-1" value={chosen} onChange={(e) => setPick(e.target.value)} aria-label="Pilih untuk ditugaskan">
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <button className="rounded-lg bg-accent px-3 py-2 text-sm text-white" onClick={() => chosen && add(chosen)}>Tugaskan</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function AddEducatorDialog({ onClose }: { onClose: () => void }) {
  const { units } = useScope();
  const { addEducator } = useStore();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Unit>(units[0]);
  return (
    <Modal
      size="sm"
      title="Tambah pendidik"
      onClose={onClose}
      dirty={name.trim().length > 0}
      saveLabel="Tambah"
      onSave={() => { if (addEducator(name, unit).ok) onClose(); }}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500">Username dibuat otomatis dari nama. Satu pendidik sementara hanya boleh bertugas di satu unit.</p>
        <Field label="Nama pendidik">
          <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        {units.length > 1 && (
          <Field label="Unit">
            <select className="w-full" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {units.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

export default function Penugasan() {
  const { data, units, educators } = useScope();
  const [view, setView] = useState<"group" | "educator">("group");
  const [q, setQ] = useState("");
  const [dlg, setDlg] = useState<{ mode: "group" | "educator"; id: string } | null>(null);
  const [adding, setAdding] = useState(false);

  const idle = educators.filter((e) => (e.groupIds ?? []).length === 0);
  const groups = Object.values(data.groups)
    .filter((g) => units.includes(g.unit))
    .sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name));
  const pesertaOf = (gid: string) => Object.values(data.students).filter((s) => s.groupId === gid).length;
  const acc: AccGroup[] = groups.map((g) => {
    const n = educators.filter((e) => e.groupIds?.includes(g.id)).length;
    return {
      id: g.id, title: `${g.unit} · ${g.name}`, total: pesertaOf(g.id),
      chips: [{ label: "belum ada pendidik", n: n === 0 ? 1 : 0, cls: "badge-warn" }, { label: "pendidik", n }],
    };
  });
  const needle = q.trim().toLowerCase();
  const eds = educators.filter((e) => !needle || e.name.toLowerCase().includes(needle) || (e.username ?? "").includes(needle));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Penugasan pendidik</h1>
        <div className="inline-flex rounded-lg border bg-white p-0.5 text-sm" role="tablist">
          {([["group", "Per kelas / halaqoh"], ["educator", "Per pendidik"]] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={view === v} className={`rounded-md px-3 py-1.5 ${view === v ? "bg-accent text-white" : "bg-white"}`} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => setAdding(true)}>Tambah pendidik</button>
      </div>

      {idle.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {idle.length} pendidik belum bertugas: {idle.map((e) => e.name).join(", ")}.
        </p>
      )}

      {view === "group" && (
        <GroupAccordion
          groups={acc}
          forceOpen={false}
          noun="peserta"
          render={(gid) => {
            const assigned = educators.filter((e) => e.groupIds?.includes(gid));
            return (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  {assigned.length === 0 && <span className="text-sm text-slate-500">Belum ada pendidik.</span>}
                  {assigned.map((e) => <Chip key={e.id} label={e.name} sub={e.username ? `@${e.username}` : undefined} />)}
                </div>
                <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setDlg({ mode: "group", id: gid })}>Atur penugasan</button>
              </div>
            );
          }}
        />
      )}

      {view === "educator" && (
        <>
          <div className="card p-3">
            <input className="w-full" placeholder="Cari pendidik…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pendidik" />
          </div>
          <ul className="card divide-y">
            {eds.map((e) => {
              const eu = educatorUnit(data, e);
              const mine = e.groupIds ?? [];
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-slate-500">{e.username ? `@${e.username}` : ""}</div>
                  </div>
                  {eu && <span className="badge badge-accent">{eu}</span>}
                  <div className="flex flex-wrap gap-1.5">
                    {mine.length === 0 && <span className="badge badge-warn">Belum bertugas</span>}
                    {mine.map((gid) => <span key={gid} className="badge">{data.groups[gid].name}</span>)}
                  </div>
                  <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => setDlg({ mode: "educator", id: e.id })}>Atur</button>
                </li>
              );
            })}
            {eds.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Tidak ada pendidik yang cocok.</li>}
          </ul>
        </>
      )}

      {dlg && <AssignDialog key={`${dlg.mode}-${dlg.id}`} mode={dlg.mode} id={dlg.id} onClose={() => setDlg(null)} />}
      {adding && <AddEducatorDialog onClose={() => setAdding(false)} />}
    </div>
  );
}