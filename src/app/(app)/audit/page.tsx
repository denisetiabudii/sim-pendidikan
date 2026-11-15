"use client";
import { useStore } from "@/lib/store";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

export default function Audit() {
  const { data } = useStore();
  const rows = data.audit.slice(0, 100);

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Audit log</h1>
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="p-2">Waktu (WIB)</th>
              <th className="p-2">Pengguna</th>
              <th className="p-2">Aksi</th>
              <th className="p-2">Objek</th>
              <th className="p-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t align-top">
                <td className="whitespace-nowrap p-2">{fmt(a.at)}</td>
                <td className="p-2">{a.actor}</td>
                <td className="p-2">{a.action}</td>
                <td className="p-2">{a.object}</td>
                <td className="p-2">{a.detail}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-3 text-slate-500">
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-slate-500">Menampilkan 100 catatan terbaru.</p>
    </div>
  );
}