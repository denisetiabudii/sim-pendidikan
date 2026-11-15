"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { ReportAction } from "@/lib/store";
import { myStudentIds } from "@/lib/access";
import { finalScore, predicate } from "@/lib/grades";
import { getReport, STATUS_LABEL } from "@/lib/reports"
import { juzText, totalMemorized } from "@/lib/hafalan";;

export default function Rapor() {
  const { data, currentUserId, changeReport } = useStore();
  const user = data.users[currentUserId];
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const ids = myStudentIds(data, user).filter(
    (id) => user.role !== "wali" || getReport(data, id).status === "published"
  );

  function act(studentId: string, action: ReportAction) {
    let reason: string | undefined;
    if (action === "publish" && !confirm("Publikasikan rapor ke orang tua? Nilai akan terkunci.")) return;
    if (action === "revise") {
      reason = prompt("Alasan revisi rapor:") ?? "";
    }
    const r = changeReport(studentId, action, reason);
    setMsg(r.ok ? "" : r.error);
  }

  const open = openId && ids.includes(openId) ? data.students[openId] : null;

  return (
    <div>
      <div className="print:hidden">
        <h1 className="mb-3 text-xl font-bold">Rapor</h1>

        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="p-2">Nama</th>
                <th className="p-2">Nilai akhir</th>
                <th className="p-2">Status</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {ids.map((id) => {
                const s = data.students[id];
                const unit = data.groups[s.groupId].unit;
                const fin = finalScore(data.components[unit], data.scores[id]);
                const rep = getReport(data, id);
                return (
                  <tr key={id} className="border-t">
                    <td className="p-2">
                      {s.name}{" "}
                      <span className="text-xs text-slate-500">
                        {unit} · {data.groups[s.groupId].name}
                      </span>
                    </td>
                    <td className="p-2">
                      {fin ?? "–"} <span className="text-xs text-slate-500">{predicate(fin)}</span>
                    </td>
                    <td className="p-2">
                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        {STATUS_LABEL[rep.status]} v{rep.version}
                      </span>
                    </td>
                    <td className="space-x-1 p-2">
                      {user.role === "pendidik" && rep.status === "draft" && (
                        <Btn primary disabled={fin === null} onClick={() => act(id, "submit")}>
                          Ajukan
                        </Btn>
                      )}
                      {user.role === "kepala" && rep.status === "submitted" && (
                        <>
                          <Btn primary onClick={() => act(id, "approve")}>Setujui</Btn>
                          <Btn onClick={() => act(id, "return")}>Kembalikan</Btn>
                        </>
                      )}
                      {user.role === "kepala" && rep.status === "approved" && (
                        <Btn primary onClick={() => act(id, "publish")}>Publikasikan</Btn>
                      )}
                      {user.role === "kepala" && rep.status === "published" && (
                        <Btn onClick={() => act(id, "revise")}>Buat revisi</Btn>
                      )}
                      <Btn onClick={() => setOpenId(id)}>Lihat</Btn>
                    </td>
                  </tr>
                );
              })}
              {ids.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-3 text-slate-500">
                    {user.role === "wali"
                      ? "Belum ada rapor yang dipublikasikan."
                      : "Tidak ada peserta dalam cakupan Anda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
        <p className="mt-2 text-sm text-slate-500">
          Alur: draft → diajukan → disetujui kepala unit → dipublikasikan (nilai terkunci).
          Koreksi setelah publikasi lewat versi revisi.
        </p>
      </div>

      {open && <ReportDetail studentId={open.id} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ReportDetail({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useStore();
  const s = data.students[studentId];
  const g = data.groups[s.groupId];
  const comps = data.components[g.unit];
  const scores = data.scores[studentId] ?? {};
  const fin = finalScore(comps, data.scores[studentId]);
  const rep = getReport(data, studentId);
  const att = data.attendance.filter((a) => a.studentId === studentId);
  const count = (st: string) => att.filter((a) => a.status === st).length;

  return (
    <section className="mt-4 rounded border bg-white p-4 print:mt-0 print:border-0">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Yayasan Yuk Peduli · Amal Pendidikan</p>
          <h2 className="text-lg font-bold">Rapor {g.unit}</h2>
          <p className="text-sm">
            {s.name} · {g.name} · versi {rep.version} · {STATUS_LABEL[rep.status]}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button className="rounded bg-teal-700 px-3 py-1.5 text-sm text-white" onClick={() => window.print()}>
            Cetak / simpan PDF
          </button>
          <button className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>

      {rep.status !== "published" && (
        <p className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
          Dokumen belum dipublikasikan. Isi masih bisa berubah.
        </p>
      )}

      <table className="mb-3 w-full text-left text-sm">
        <thead className="text-slate-500">
          <tr>
            <th className="py-1">Komponen</th>
            <th className="py-1">Bobot</th>
            <th className="py-1">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {comps.map((c) => (
            <tr key={c.name} className="border-t">
              <td className="py-1">{c.name}</td>
              <td className="py-1">{c.weight}%</td>
              <td className="py-1">{scores[c.name] ?? "–"}</td>
            </tr>
          ))}
          <tr className="border-t font-bold">
            <td className="py-1" colSpan={2}>Nilai akhir</td>
            <td className="py-1">
              {fin ?? "–"} ({predicate(fin)})
            </td>
          </tr>
        </tbody>
      </table>

      <p className="text-sm">
        Kehadiran: Hadir {count("Hadir")}, Terlambat {count("Terlambat")}, Izin {count("Izin")},
        Sakit {count("Sakit")}, Alpa {count("Alpa")} (dari {att.length} catatan)
      </p>
      {g.unit === "RTQ" && (
        <p className="mt-1 text-sm">
          Hafalan: {totalMemorized(data.recitations, studentId)} ayat tercatat. {juzText(data.recitations, studentId)}.
        </p>
      )}

      {rep.revisions && rep.revisions.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">
          Riwayat revisi: {rep.revisions.map((r) => `v${r.version} (${r.reason})`).join("; ")}
        </p>
      )}
    </section>
  );
}

function Btn({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded border px-2.5 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
        primary ? "border-teal-700 bg-teal-700 text-white" : ""
      }`}
    >
      {children}
    </button>
  );
}