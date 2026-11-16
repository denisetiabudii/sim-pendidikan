"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { myGroupIds } from "@/lib/access";
import { weightsLocked, weightsTotal } from "@/lib/grades";
import type { Unit } from "@/lib/types";
import InstitutionSettings from "@/components/InstitutionSettings";

export default function Pengaturan() {
  const { data, currentUserId, setWeight, addGroup } = useStore();
  const user = data.users[currentUserId];
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [unitPick, setUnitPick] = useState<Unit | "">("");

  const units: Unit[] =
    user.role === "direktur" ? ["TKQ", "RTQ"] : user.unit ? [user.unit] : [];
  const unit = units.includes(unitPick as Unit) ? (unitPick as Unit) : units[0];
  const groups = myGroupIds(data, user);

  function commitWeight(u: Unit, component: string, raw: string, old: number) {
    if (raw.trim() === "" || Number(raw) === old) return;
    const r = setWeight(u, component, Number(raw));
    setMsg(r.ok ? "" : r.error);
  }

  function add() {
    const r = addGroup(name, unit);
    setMsg(r.ok ? "" : r.error);
    if (r.ok) setName("");
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Pengaturan akademik</h1>

      {units
        .filter((u) => u === "TKQ")
        .map((u) => {
          const total = weightsTotal(data.components[u]);
          const locked = weightsLocked(data, u);
          return (
            <section key={u} className="mb-4 rounded border bg-white p-4">
              <h2 className="mb-2 font-semibold">Komponen dan bobot {u}</h2>
              {locked && (
                <p className="mb-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                  Bobot terkunci karena sudah ada rapor yang disetujui atau
                  dipublikasikan di unit ini. Perubahan formula setelah rapor
                  terbit perlu proses versi baru yang menunggu keputusan
                  akademik.
                </p>
              )}
              {data.components[u].map((c) => (
                <div
                  key={c.name}
                  className="mb-2 flex items-center gap-2 text-sm"
                >
                  <span className="w-44">{c.name}</span>
                  <input
                    key={`${u}-${c.name}-${c.weight}`}
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={c.weight}
                    aria-label={`Bobot ${c.name} ${u}`}
                    disabled={locked}
                    className="w-20 rounded border p-1.5 disabled:bg-slate-100"
                    onBlur={(e) =>
                      commitWeight(u, c.name, e.target.value, c.weight)
                    }
                  />
                  <span>%</span>
                </div>
              ))}
              <p
                className={`text-sm font-bold ${total === 100 ? "text-green-700" : "text-red-700"}`}
              >
                Total {total}% {total === 100 ? "✓" : "– harus 100%"}
              </p>
            </section>
          );
        })}

      {units.includes("RTQ") && (
        <section className="mb-4 rounded border bg-white p-4 text-sm text-slate-600">
          <b>RTQ</b> tidak memakai bobot. Rata-rata tahfidz dihitung dari
          (jumlah nilai harian + jumlah nilai evaluasi) ÷ jumlah seluruh nilai.
        </section>
      )}
      {user.role === "direktur" && <InstitutionSettings />}

      <section className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Kelas dan halaqoh</h2>
        <ul className="mb-3 text-sm">
          {groups.map((g) => (
            <li key={g} className="py-0.5">
              <span className="mr-2 rounded-full border px-2 py-0.5 text-xs">
                {data.groups[g].unit}
              </span>
              {data.groups[g].name}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <input
            className="rounded border p-2 text-sm"
            placeholder="Nama kelas atau halaqoh baru"
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
            onClick={add}
          >
            Tambah
          </button>
        </div>
      </section>

      {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
      <p className="mt-2 text-sm text-slate-500">
        Bobot terkunci setelah ada rapor disetujui atau dipublikasikan di unit
        tersebut. Kelas atau halaqoh baru belum memiliki pendidik, penugasan
        pendidik dibuat pada langkah berikutnya.
      </p>
    </div>
  );
}
