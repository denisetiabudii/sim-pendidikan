"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/useToday";
import { myStudentIds } from "@/lib/access";
import {
  attendanceRate, incompleteScores, lastDays, missingAttendance,
  newIncidents, reportBuckets, unreadNotes,
} from "@/lib/dashboard";
import { juzText, totalMemorized } from "@/lib/hafalan";
import { finalScore, predicate } from "@/lib/grades";
import { getReport } from "@/lib/reports";

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

export default function Ringkasan() {
  const { data, currentUserId } = useStore();
  const today = useToday();
  const user = data.users[currentUserId];

  if (user.role === "wali") return <Wali />;

  const ids = myStudentIds(data, user);
  const days = lastDays(today, 7);
  const rate = attendanceRate(data, ids, days);
  const b = reportBuckets(data, ids);

  const tasks: { href: string; text: string }[] = [];
  if (user.role !== "direktur") {
    for (const m of missingAttendance(data, user, today)) {
      const g = data.groups[m.groupId];
      tasks.push({ href: "/absensi", text: `Absensi hari ini belum diisi: ${g.unit} ${g.name} (${m.missing} dari ${m.total} peserta)` });
    }
  }
  if (user.role === "pendidik") {
    const inc = incompleteScores(data, ids);
    if (inc) tasks.push({ href: "/nilai", text: `${inc} peserta nilainya belum lengkap` });
    if (b.readyToSubmit) tasks.push({ href: "/rapor", text: `${b.readyToSubmit} rapor siap diajukan` });
  }
  if (user.role === "kepala") {
    if (b.submitted) tasks.push({ href: "/rapor", text: `${b.submitted} rapor menunggu persetujuan` });
    if (b.approved) tasks.push({ href: "/rapor", text: `${b.approved} rapor disetujui, siap dipublikasikan` });
    const ni = newIncidents(data, user);
    if (ni) tasks.push({ href: "/kejadian", text: `${ni} catatan kejadian baru belum ditindaklanjuti` });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Ringkasan</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi value={ids.length} label="peserta dalam cakupan Anda" />
        <Kpi value={rate === null ? "–" : `${rate}%`} label="kehadiran 7 hari terakhir" />
        <Kpi value={`${b.published}/${ids.length}`} label="rapor dipublikasikan" />
      </div>

      {user.role !== "direktur" && (
        <section className="rounded border bg-white p-3">
          <h2 className="mb-2 font-semibold">Perlu dikerjakan</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-green-700">Semua tugas sudah selesai. ✓</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {tasks.map((t, i) => (
                <li key={i}>
                  <Link href={t.href} className="text-teal-800 underline">{t.text}</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {user.role === "direktur" && (
        <section className="rounded border bg-white p-3">
          <h2 className="mb-2 font-semibold">Ringkasan per unit</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="p-1">Unit</th><th className="p-1">Peserta</th><th className="p-1">Kehadiran 7 hari</th>
                  <th className="p-1">Rapor (draft / diajukan / disetujui / terbit)</th><th className="p-1">Kejadian baru</th>
                </tr>
              </thead>
              <tbody>
                {(["TKQ", "RTQ"] as const).map((u) => {
                  const uIds = ids.filter((id) => data.groups[data.students[id].groupId].unit === u);
                  const ub = reportBuckets(data, uIds);
                  const ur = attendanceRate(data, uIds, days);
                  const inc = data.incidents.filter(
                    (i) => i.status === "Baru" && data.groups[data.students[i.studentId].groupId].unit === u
                  ).length;
                  return (
                    <tr key={u} className="border-t">
                      <td className="p-1 font-semibold">{u}</td>
                      <td className="p-1">{uIds.length}</td>
                      <td className="p-1">{ur === null ? "–" : `${ur}%`}</td>
                      <td className="p-1">{ub.draft} / {ub.submitted} / {ub.approved} / {ub.published}</td>
                      <td className="p-1">{inc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Trend days={days} rates={days.map((d) => attendanceRate(data, ids, [d]))} />
    </div>
  );
}

function Wali() {
  const { data, currentUserId } = useStore();
  const today = useToday();
  const user = data.users[currentUserId];
  const ids = myStudentIds(data, user);
  const days = lastDays(today, 30);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Anak saya</h1>
      {ids.map((id) => {
        const s = data.students[id];
        const g = data.groups[s.groupId];
        const rate = attendanceRate(data, [id], days);
        const published = getReport(data, id).status === "published";
        const fin = finalScore(data.components[g.unit], data.scores[id]);
        const unread = unreadNotes(data, [id]);
        return (
          <article key={id} className="rounded border bg-white p-3">
            <h2 className="font-semibold">
              {s.name} <span className="text-xs font-normal text-slate-500">{g.unit} · {g.name}</span>
            </h2>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              <li>Kehadiran 30 hari terakhir: {rate === null ? "belum ada data" : `${rate}%`}</li>
              <li>
                {published ? (
                  <>Rapor terbit: nilai akhir {fin ?? "–"} ({predicate(fin)}). <Link href="/rapor" className="text-teal-800 underline">Lihat rapor</Link></>
                ) : (
                  "Rapor belum dipublikasikan."
                )}
              </li>
              <li>
                {unread > 0 ? (
                  <Link href="/buku-penghubung" className="font-semibold text-teal-800 underline">{unread} catatan guru belum dibaca</Link>
                ) : (
                  "Tidak ada catatan baru dari guru."
                )}
              </li>
              {g.unit === "RTQ" && (
                <li>Hafalan: {totalMemorized(data.recitations, id)} ayat. {juzText(data.recitations, id)}.</li>
              )}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

function Trend({ days, rates }: { days: string[]; rates: (number | null)[] }) {
  return (
    <section className="rounded border bg-white p-3">
      <h2 className="mb-2 font-semibold">Kehadiran 7 hari terakhir</h2>
      {days.length === 0 ? (
        <p className="text-sm text-slate-500">Memuat…</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {days.map((d, i) => (
            <li key={d} className="flex items-center gap-2">
              <span className="w-28 text-slate-500">{fmtDay(d)}</span>
              <div className="h-3 flex-1 rounded bg-slate-100">
                <div className="h-3 rounded bg-teal-600" style={{ width: `${rates[i] ?? 0}%` }} />
              </div>
              <span className="w-12 text-right">{rates[i] === null ? "–" : `${rates[i]}%`}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}