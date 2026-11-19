"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { educatorUnit } from "@/lib/access";
import { Field, FormGroup } from "@/components/FormSection";
import type { Unit, User } from "@/lib/types";

type Res = { ok: boolean; error?: string };

const UNIT_TOP: Record<Unit, string> = { TKQ: "border-t-blue-500", RTQ: "border-t-violet-500" };

export default function Penugasan() {
  const { data, assignEducator, unassignEducator, addEducator } = useStore();
  const user = useUser();
  const [view, setView] = useState<"group" | "educator">("group");
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [unitPick, setUnitPick] = useState<Unit | "">("");

  const units: Unit[] = user.role === "direktur" ? ["TKQ", "RTQ"] : user.unit ? [user.unit] : [];
  const unit = units.includes(unitPick as Unit) ? (unitPick as Unit) : units[0];
  const done = (r: Res) => setMsg(r.ok ? "" : r.error ?? "Gagal");

  const educators = Object.values(data.users).filter((u) => {
    if (u.role !== "pendidik") return false;
    const eu = educatorUnit(data, u);
    return !eu || units.includes(eu);
  });
  const idle = educators.filter((e) => (e.groupIds ?? []).length === 0);
  const groupsOf = (u: Unit) => Object.values(data.groups).filter((g) => g.unit === u);
  const peserta = (gid: string) => Object.values(data.students).filter((s) => s.groupId === gid).length;

  function remove(e: User, gid: string) {
    if (confirm(`Cabut ${e.name} dari ${data.groups[gid].name}?`)) done(unassignEducator(e.id, gid));
  }

  // Pilihan pendidik atau kelompok yang masih bisa ditambahkan.
  function AddRow({ id, options, onAdd }: { id: string; options: { id: string; label: string }[]; onAdd: (v: string) => void }) {
    const chosen = options.some((o) => o.id === pick[id]) ? pick[id] : options[0]?.id;
    if (options.length === 0) return null;
    return (
      <div className="mt-3 flex gap-2">
        <select
          className="min-w-0 flex-1 text-sm"
          value={chosen}
          onChange={(e) => setPick({ ...pick, [id]: e.target.value })}
          aria-label="Pilih untuk ditugaskan"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => chosen && onAdd(chosen)}>
          Tugaskan
        </button>
      </div>
    );
  }

  const Chip = ({ label, sub, onRemove, removeLabel }: { label: string; sub?: string; onRemove: () => void; removeLabel: string }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-white py-1 pl-3 pr-1.5 text-sm">
      {label}
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
      <button className="rounded-full px-1.5 text-red-700 hover:bg-red-50" aria-label={removeLabel} onClick={onRemove}>✕</button>
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Penugasan pendidik</h1>
        <div className="inline-flex rounded-lg border bg-white p-0.5 text-sm" role="tablist">
          {([["group", "Per kelas / halaqoh"], ["educator", "Per pendidik"]] as const).map(([v, label]) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              className={`rounded-md px-3 py-1.5 ${view === v ? "bg-accent text-white" : ""}`}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {idle.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {idle.length} pendidik belum bertugas: {idle.map((e) => e.name).join(", ")}.
        </p>
      )}
      {msg && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{msg}</p>}

      {view === "group" &&
        units.map((u) => (
          <section key={u}>
            <h2 className="mb-2 flex items-center gap-2">
              {u}
              <span className="badge">{groupsOf(u).length} kelompok</span>
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {groupsOf(u).map((g) => {
                const assigned = educators.filter((e) => e.groupIds?.includes(g.id));
                const candidates = educators
                  .filter((e) => {
                    const eu = educatorUnit(data, e);
                    return !e.groupIds?.includes(g.id) && (!eu || eu === g.unit);
                  })
                  .map((e) => ({ id: e.id, label: e.name }));
                return (
                  <article key={g.id} className={`card border-t-4 p-4 ${UNIT_TOP[g.unit]}`}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="flex-1">{g.name}</h3>
                      <span className="badge">{peserta(g.id)} peserta</span>
                      {assigned.length === 0 && <span className="badge badge-warn">Belum ada pendidik</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assigned.map((e) => (
                        <Chip
                          key={e.id}
                          label={e.name}
                          sub={e.username ? `@${e.username}` : undefined}
                          removeLabel={`Cabut ${e.name} dari ${g.name}`}
                          onRemove={() => remove(e, g.id)}
                        />
                      ))}
                    </div>
                    <AddRow id={g.id} options={candidates} onAdd={(uid) => done(assignEducator(uid, g.id))} />
                  </article>
                );
              })}
            </div>
          </section>
        ))}

      {view === "educator" && (
        <div className="grid gap-3 md:grid-cols-2">
          {educators.map((e) => {
            const eu = educatorUnit(data, e);
            const mine = e.groupIds ?? [];
            const candidates = Object.values(data.groups)
              .filter((g) => units.includes(g.unit) && (!eu || eu === g.unit) && !mine.includes(g.id))
              .map((g) => ({ id: g.id, label: `${g.unit} · ${g.name}` }));
            return (
              <article key={e.id} className="card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate">{e.name}</h3>
                    {e.username && <div className="text-xs text-slate-500">@{e.username}</div>}
                  </div>
                  {eu && <span className="badge badge-accent">{eu}</span>}
                  {mine.length === 0 && <span className="badge badge-warn">Belum bertugas</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {mine.map((gid) => (
                    <Chip
                      key={gid}
                      label={`${data.groups[gid].unit} · ${data.groups[gid].name}`}
                      removeLabel={`Cabut ${e.name} dari ${data.groups[gid].name}`}
                      onRemove={() => remove(e, gid)}
                    />
                  ))}
                </div>
                <AddRow id={e.id} options={candidates} onAdd={(gid) => done(assignEducator(e.id, gid))} />
              </article>
            );
          })}
        </div>
      )}

      <section className="card space-y-3 p-4">
        <h2>Tambah pendidik</h2>
        <FormGroup step={1} title="Data pendidik" hint="Username dibuat otomatis dari nama. Satu pendidik sementara hanya boleh bertugas di satu unit.">
          <Field label="Nama pendidik">
            <input className="w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {units.length > 1 && (
            <Field label="Unit">
              <select className="w-full" value={unit} onChange={(e) => setUnitPick(e.target.value as Unit)}>
                {units.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </Field>
          )}
        </FormGroup>
        <button
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white"
          onClick={() => {
            const r = addEducator(name, unit);
            done(r);
            if (r.ok) setName("");
          }}
        >
          Tambah pendidik
        </button>
      </section>
    </div>
  );
}