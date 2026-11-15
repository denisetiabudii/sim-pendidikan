"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { educatorUnit, myGroupIds } from "@/lib/access";
import type { Unit } from "@/lib/types";

type Res = { ok: boolean; error?: string };

export default function Penugasan() {
  const { data, currentUserId, assignEducator, unassignEducator, addEducator } =
    useStore();
  const user = data.users[currentUserId];
  const [msg, setMsg] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [unitPick, setUnitPick] = useState<Unit | "">("");

  const units: Unit[] =
    user.role === "direktur" ? ["TKQ", "RTQ"] : user.unit ? [user.unit] : [];
  const unit = units.includes(unitPick as Unit) ? (unitPick as Unit) : units[0];
  const groups = myGroupIds(data, user);
  const educators = Object.values(data.users).filter(
    (u) => u.role === "pendidik",
  );

  const done = (r: Res) => setMsg(r.ok ? "" : (r.error ?? "Gagal"));

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Penugasan pendidik</h1>

      <div className="space-y-3">
        {groups.map((gid) => {
          const g = data.groups[gid];
          const assigned = educators.filter((e) => e.groupIds?.includes(gid));
          const candidates = educators.filter((e) => {
            const eu = educatorUnit(data, e);
            return !e.groupIds?.includes(gid) && (!eu || eu === g.unit);
          });
          const chosen = candidates.some((c) => c.id === pick[gid])
            ? pick[gid]
            : candidates[0]?.id;

          return (
            <section key={gid} className="rounded border bg-white p-3">
              <h2 className="mb-2 font-semibold">
                <span className="mr-2 rounded-full border px-2 py-0.5 text-xs">
                  {g.unit}
                </span>
                {g.name}
              </h2>

              <div className="mb-2 flex flex-wrap gap-2">
                {assigned.length === 0 && (
                  <span className="text-sm text-slate-500">
                    Belum ada pendidik.
                  </span>
                )}
                {assigned.map((e) => (
                  <span
                    key={e.id}
                    className="flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
                  >
                    {e.name}{" "}
                    <span className="text-xs text-slate-500">
                      @{e.username}
                    </span>
                    <button
                      aria-label={`Cabut ${e.name} dari ${g.name}`}
                      className="text-red-700"
                      onClick={() => done(unassignEducator(e.id, gid))}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {candidates.length > 0 && (
                <div className="flex gap-2">
                  <select
                    className="rounded border bg-white p-1.5 text-sm"
                    value={chosen}
                    onChange={(e) =>
                      setPick({ ...pick, [gid]: e.target.value })
                    }
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded bg-teal-700 px-3 py-1.5 text-sm text-white"
                    onClick={() => chosen && done(assignEducator(chosen, gid))}
                  >
                    Tugaskan
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-4 rounded border bg-white p-3">
        <h2 className="mb-2 font-semibold">Tambah pendidik</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border p-2 text-sm"
            placeholder="Nama pendidik"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {units.length > 1 && (
            <select
              className="rounded border bg-white p-2 text-sm"
              value={unit}
              onChange={(e) => setUnitPick(e.target.value as Unit)}
            >
              {units.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          )}
          <button
            className="rounded bg-teal-700 px-3 py-2 text-sm text-white"
            onClick={() => {
              const r = addEducator(name, unit);
              done(r);
              if (r.ok) setName("");
            }}
          >
            Tambah
          </button>
        </div>
      </section>

      {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
      <p className="mt-2 text-sm text-slate-500">
        Satu pendidik sementara hanya boleh bertugas di satu unit. Penugasan per
        periode akademik menyusul bersama modul periode.
      </p>
    </div>
  );
}
