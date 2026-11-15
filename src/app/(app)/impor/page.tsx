"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { importBatchInUse, MAX_ROWS, parseCsv, validateRows } from "@/lib/csv";
import type { PreviewRow } from "@/lib/csv";

const SAMPLE = "nama,kelompok\nAmina,Kelas A\nYusuf,Kelas B\n";
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

export default function Impor() {
  const { data, currentUserId, importStudents, undoImport } = useStore();
  const user = data.users[currentUserId];
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [msg, setMsg] = useState("");

  const ok = preview ? preview.filter((r) => !r.error).length : 0;
    const history = data.imports.filter(
    (b) => user.role === "direktur" || b.actorId === user.id
  );

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setPreview(null);
      setMsg("");
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function makePreview() {
    const raw = parseCsv(text);
    if (raw.length === 0) return setMsg("Isi data terlebih dahulu.");
    if (raw.length > MAX_ROWS + 1) return setMsg(`Maksimal ${MAX_ROWS} baris per impor.`);
    setMsg("");
    setPreview(validateRows(data, user, raw));
  }

  function commit() {
    const r = importStudents(parseCsv(text));
    if (r.ok) {
      setMsg(`${r.count} peserta berhasil diimpor.`);
      setText("");
      setPreview(null);
    } else setMsg(r.error);
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Impor peserta</h1>

      <section className="mb-4 rounded border bg-white p-3">
        <p className="mb-2 text-sm text-slate-600">
          Format CSV dengan kolom <b>nama,kelompok</b>. Kolom ketiga <b>unit</b> opsional, dipakai bila
          nama kelompok sama di dua unit. Nama kelompok harus sama dengan kelas atau halaqoh yang ada
          di cakupan Anda.
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv,text/csv" onChange={onFile} aria-label="Pilih berkas CSV" />
          <button
            className="rounded border px-3 py-1.5 text-sm"
            onClick={() => {
              setText(SAMPLE);
              setPreview(null);
            }}
          >
            Isi contoh
          </button>
        </div>
        <textarea
          className="w-full rounded border p-2 font-mono text-sm"
          rows={6}
          placeholder="nama,kelompok"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
        />
        <button className="mt-2 rounded bg-teal-700 px-3 py-2 text-sm text-white" onClick={makePreview}>
          Pratinjau
        </button>
      </section>

      {preview && (
        <section className="mb-4 rounded border bg-white p-3">
          <h2 className="mb-2 font-semibold">
            {ok} baris valid, {preview.length - ok} bermasalah
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="p-2">Baris</th>
                  <th className="p-2">Nama</th>
                  <th className="p-2">Kelompok</th>
                  <th className="p-2">Hasil</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.line} className="border-t">
                    <td className="p-2">{r.line}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.groupName}</td>
                    <td className={`p-2 ${r.error ? "text-red-700" : "text-green-700"}`}>
                      {r.error ?? "Siap diimpor"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="mt-2 rounded bg-teal-700 px-3 py-2 text-sm text-white disabled:opacity-40"
            disabled={ok === 0}
            onClick={commit}
          >
            Impor {ok} baris valid
          </button>
        </section>
      )}

      {msg && <p className="mb-3 text-sm">{msg}</p>}

            <section className="rounded border bg-white p-3 text-sm">
        <h2 className="mb-2 font-semibold">Riwayat impor</h2>
        {history.length === 0 && <p className="text-slate-500">Belum ada impor.</p>}
        <ul className="space-y-2">
          {history.map((b) => {
            const used = importBatchInUse(data, b);
            const names = b.studentIds
              .map((id) => data.students[id]?.name)
              .filter(Boolean);
            return (
              <li key={b.id} className="flex flex-wrap items-center gap-2 border-t pt-2 first:border-t-0 first:pt-0">
                <div className="min-w-48 flex-1">
                  <div>
                    {fmt(b.at)} · {b.studentIds.length} peserta · {data.users[b.actorId]?.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {names.slice(0, 4).join(", ")}
                    {names.length > 4 ? `, +${names.length - 4} lainnya` : ""}
                  </div>
                </div>
                {used && (
                  <span className="text-xs text-slate-500">sudah dipakai, tidak bisa dibatalkan</span>
                )}
                <button
                  className="rounded border px-2.5 py-1 text-red-700 disabled:opacity-40"
                  disabled={used}
                  onClick={() => {
                    if (!confirm(`Batalkan impor ini dan hapus ${b.studentIds.length} peserta?`)) return;
                    const r = undoImport(b.id);
                    setMsg(r.ok ? "Impor dibatalkan." : r.error);
                  }}
                >
                  Batalkan
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}