"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { canViewIncident, educatorUnit, myGroupIds, myStudentIds } from "@/lib/access";
import {
  attendanceRate, incompleteScores, lastDays, missingAttendance, newIncidents,
  progressBars, reportStatusRows, reportTasks, taskText, unreadNotes,
} from "@/lib/dashboard";
import { fmtNum, rtqKey, tahfidzAverage, tahfidzPredikat } from "@/lib/rtq";
import type { Quarter, Unit } from "@/lib/types";
import { juzText, totalMemorized } from "@/lib/hafalan";
import { finalScore, predicate } from "@/lib/grades";
import { getReport } from "@/lib/reports";

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

const TONES = {
  blue: "border-l-blue-500",
  green: "border-l-emerald-500",
  violet: "border-l-violet-500",
  amber: "border-l-amber-500",
};

export default function Ringkasan() {
  const { data } = useStore();
  const user = useUser();
  const today = useToday();
  if (user.role === "wali") return <Wali />;

  const ids = myStudentIds(data, user);
  const days = lastDays(today, 7);
  const unit = user.role === "direktur" ? undefined : educatorUnit(data, user);
  const rate = attendanceRate(data, ids, days);
  const units = (["TKQ", "RTQ"] as Unit[]).filter((u) =>
    ids.some((id) => data.groups[data.students[id].groupId].unit === u)
  );
  const published = units
    .flatMap((u) => reportStatusRows(data, ids, u, today))
    .reduce((a, r) => a + r.counts.published, 0);
  const newInc = data.incidents.filter(
    (i) => i.status === "Baru" && ids.includes(i.studentId) && canViewIncident(data, user, i)
  ).length;
  const tkqIds = ids.filter((id) => data.groups[data.students[id].groupId].unit === "TKQ");

  const tasks: { href: string; text: string }[] = [];
  if (user.role !== "direktur")
    for (const m of missingAttendance(data, user, today)) {
      const g = data.groups[m.groupId];
      tasks.push({ href: "/absensi", text: `Absensi hari ini belum diisi: ${g.unit} ${g.name} (${m.missing} dari ${m.total} peserta)` });
    }
  if (user.role === "pendidik") {
    const inc = incompleteScores(data, tkqIds);
    if (inc) tasks.push({ href: "/nilai", text: `${inc} peserta nilainya belum lengkap` });
  }
  for (const t of reportTasks(data, user, ids)) tasks.push({ href: t.href, text: taskText(t) });
  if (user.role === "kepala" && newInc)
    tasks.push({ href: "/kejadian", text: `${newInc} catatan kejadian baru belum ditindaklanjuti` });
  void newIncidents;

  const groups = myGroupIds(data, user).map((g) => data.groups[g].name).join(", ");
  const noun = unit === "RTQ" ? "santri" : unit === "TKQ" ? "siswa" : "peserta";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Assalamu&apos;alaikum, {user.name}
          {groups && user.role !== "direktur" && <span className="block text-xs text-slate-500">{unit} · {groups}</span>}
          {user.role === "direktur" && (
            <span className="block text-xs text-slate-500">
              Ringkasan lintas unit (hanya melihat). Persetujuan dan publikasi rapor dilakukan kepala unit.
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi tone="blue" value={ids.length} label={noun} />
        <Kpi tone="green" value={rate === null ? "–" : `${rate}%`} label="kehadiran 7 hari terakhir" />
        <Kpi tone="violet" value={published} label="rapor sudah terbit" />
        <Kpi tone="amber" value={newInc} label="kejadian baru" />
      </div>

      {user.role !== "direktur" && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-2 font-semibold">Perlu dikerjakan</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-green-700">Semua tugas sudah selesai. ✓</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {tasks.map((t, i) => (
                <li key={i}><Link href={t.href} className="text-teal-800 underline">{t.text}</Link></li>
              ))}
            </ul>
          )}
        </section>
      )}

      <div className={`grid gap-4 ${units.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {units.map((u) => (
          <UnitCard key={u} unit={u} ids={ids} days={days} today={today} />
        ))}
      </div>

      {(user.role === "kepala" || user.role === "direktur") && <GroupTable ids={ids} days={days} today={today} />}

      <Trend days={days} rates={days.map((d) => attendanceRate(data, ids, [d]))} />
    </div>
  );
}

function UnitCard({ unit, ids, days, today }: { unit: Unit; ids: string[]; days: string[]; today: string }) {
  const { data } = useStore();
  const user = useUser();
  const mine = ids.filter((id) => data.groups[data.students[id].groupId].unit === unit);
  if (mine.length === 0) return null;

  const rtq = unit === "RTQ";
  const rows = reportStatusRows(data, mine, unit, today);
  const bars = progressBars(data, mine, unit, days);
  const inc = data.incidents.filter(
    (i) => i.status === "Baru" && mine.includes(i.studentId) && canViewIncident(data, user, i)
  ).length;
  const barColor = rtq ? "bg-violet-600" : "bg-blue-600";

  return (
    <section className={`rounded-xl border-t-4 bg-white p-4 ${rtq ? "border-violet-500" : "border-blue-500"}`}>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold">{unit}</h2>
        <span className="text-sm text-slate-500">{mine.length} {rtq ? "santri" : "siswa"}</span>
        {inc > 0 && (
          <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            {inc} kejadian baru
          </span>
        )}
      </div>

      <ul className="mb-4 space-y-3 text-sm">
        {bars.map((b) => (
          <li key={b.label}>
            <div className="mb-1 flex justify-between">
              <span>{b.label}</span>
              <b>{b.pct === null ? "–" : `${b.pct}%`}</b>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div className={`h-2.5 rounded-full ${barColor}`} style={{ width: `${b.pct ?? 0}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <h3 className="mb-1 text-sm font-semibold">Status rapor (jumlah {rtq ? "santri" : "siswa"})</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-500">
            <tr>
              <th className="p-1.5">Kuartal</th>
              <th className="p-1.5">Belum diisi</th>
              <th className="p-1.5">Draft</th>
              <th className="p-1.5">Menunggu persetujuan</th>
              <th className="p-1.5">Disetujui</th>
              <th className="p-1.5">Terbit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t">
                <td className="p-1.5 font-medium">{r.label}</td>
                <td className="p-1.5">{r.counts.belum}</td>
                <td className="p-1.5">{r.counts.draft}</td>
                <td className={`p-1.5 ${r.counts.submitted ? "font-bold text-amber-700" : ""}`}>{r.counts.submitted}</td>
                <td className="p-1.5">{r.counts.approved}</td>
                <td className={`p-1.5 ${r.counts.published ? "font-bold text-green-700" : ""}`}>{r.counts.published}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="p-1.5 text-slate-500">Belum ada kuartal yang berjalan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {rtq ? "Rapor dibuat per kuartal. Hanya kuartal yang sudah berjalan yang tampil." : "Rapor TKQ memakai format lama sampai format baru dari klien diterima."}
      </p>
    </section>
  );
}

function GroupTable({ ids, days, today }: { ids: string[]; days: string[]; today: string }) {
  const { data } = useStore();
  const user = useUser();
  const rows = myGroupIds(data, user).map((g) => {
    const sids = ids.filter((id) => data.students[id].groupId === g);
    const filled = sids.filter((id) => data.attendance.some((a) => a.studentId === id && a.date === today)).length;
    return { g, n: sids.length, filled, rate: attendanceRate(data, sids, days) };
  });
  return (
    <section className="rounded-xl border bg-white p-4">
      <h2 className="mb-2 font-semibold">Per kelas dan halaqoh</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="p-1.5">Kelas / halaqoh</th>
              <th className="p-1.5">Peserta</th>
              <th className="p-1.5">Absensi hari ini</th>
              <th className="p-1.5">Kehadiran 7 hari</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.g} className="border-t">
                <td className="p-1.5">
                  <span className="mr-2 rounded-full border px-2 py-0.5 text-xs">{data.groups[r.g].unit}</span>
                  {data.groups[r.g].name}
                </td>
                <td className="p-1.5">{r.n}</td>
                <td className={`p-1.5 ${r.filled < r.n ? "text-amber-700" : "text-green-700"}`}>
                  {r.filled} dari {r.n} terisi
                </td>
                <td className="p-1.5">{r.rate === null ? "–" : `${r.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Wali() {
  const { data } = useStore();
  const user = useUser();
  const today = useToday();
  const ids = myStudentIds(data, user);
  const days = lastDays(today, 30);
  const year = data.academic.year;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">Anak saya</h1>
      {ids.map((id) => {
        const s = data.students[id];
        const g = data.groups[s.groupId];
        const rate = attendanceRate(data, [id], days);
        const unread = unreadNotes(data, [id]);

        let report: React.ReactNode;
        if (g.unit === "TKQ") {
          const published = getReport(data, id).status === "published";
          const fin = finalScore(data.components.TKQ, data.scores[id]);
          report = published ? (
            <>Rapor terbit: nilai akhir {fin ?? "–"} ({predicate(fin)}). <Link href="/rapor" className="text-teal-800 underline">Lihat rapor</Link></>
          ) : "Rapor belum dipublikasikan.";
        } else {
          const pq = ([3, 2, 1] as Quarter[]).find((k) => data.rtqReports[rtqKey(id, year, k)]?.status === "published");
          const rr = pq ? data.rtqReports[rtqKey(id, year, pq)] : undefined;
          const avg = rr ? tahfidzAverage(rr.tahfidz) : null;
          const band = tahfidzPredikat(avg);
          report = rr ? (
            <>
              Rapor Kuartal {pq} terbit: rata-rata tahfidz {fmtNum(avg)}{band ? ` (${band.predikat} · ${band.name})` : ""}.{" "}
              <Link href="/rapor-kuartal" className="text-teal-800 underline">Lihat rapor</Link>
            </>
          ) : "Rapor belum dipublikasikan.";
        }

        return (
          <article key={id} className={`rounded-xl border-l-4 bg-white p-4 ${g.unit === "RTQ" ? "border-violet-500" : "border-blue-500"}`}>
            <h2 className="font-semibold">
              {s.name} <span className="text-xs font-normal text-slate-500">{g.unit} · {g.name}</span>
            </h2>
            <ul className="mt-1 space-y-1 text-sm text-slate-700">
              <li>Kehadiran 30 hari terakhir: {rate === null ? "belum ada data" : `${rate}%`}</li>
              <li>{report}</li>
              <li>
                {unread > 0 ? (
                  <Link href="/buku-penghubung" className="font-semibold text-teal-800 underline">{unread} catatan guru belum dibaca</Link>
                ) : "Tidak ada catatan baru dari guru."}
              </li>
              {g.unit === "RTQ" && <li>Hafalan: {totalMemorized(data.recitations, id)} ayat. {juzText(data.recitations, id)}.</li>}
            </ul>
          </article>
        );
      })}
    </div>
  );
}

function Trend({ days, rates }: { days: string[]; rates: (number | null)[] }) {
  return (
    <section className="rounded-xl border bg-white p-4">
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

function Kpi({ value, label, tone }: { value: string | number; label: string; tone: keyof typeof TONES }) {
  return (
    <div className={`card border-l-4 p-4 ${TONES[tone]}`}>
      <div className="text-3xl font-bold leading-none text-slate-900">{value}</div>
      <div className="mt-1.5 text-sm text-slate-600">{label}</div>
    </div>
  );
}