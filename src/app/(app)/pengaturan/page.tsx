"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { myGroupIds } from "@/lib/access";
import type { Unit } from "@/lib/types";
import InstitutionSettings from "@/components/InstitutionSettings";

export default function Pengaturan() {
  const { data, currentUserId, addGroup } = useStore();
  const user = data.users[currentUserId];
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [unitPick, setUnitPick] = useState<Unit | "">("");

  const units: Unit[] =
    user.role === "direktur" ? ["TKQ", "RTQ"] : user.unit ? [user.unit] : [];
  const unit = units.includes(unitPick as Unit) ? (unitPick as Unit) : units[0];
  const groups = myGroupIds(data, user);

  function add() {
    const r = addGroup(name, unit);
    setMsg(r.ok ? "" : r.error);
    if (r.ok) setName("");
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Pengaturan akademik</h1>

      {units.includes("TKQ") && (
        <section className="card p-4 text-sm text-slate-600">
          <b>TKQ</b> memakai penilaian BB/MB/BSH/BSB di menu Penilaian & Raport, tanpa bobot. Daftar indikator PAI
          saat ini satu untuk semua kelas, dan editornya menyusul.
        </section>
      )}

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
