"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useToday } from "@/lib/useToday";
import { myGroupIds, myStudentIds } from "@/lib/access";
import { RECITATION_KINDS, RECITATION_QUALITIES } from "@/lib/constants";
import { lastDays } from "@/lib/dashboard";
import { juzText, totalMemorized } from "@/lib/hafalan";
import {
  SURAHS, isolateAr, matchSurah, surahArabic, surahLabel, surahOption, surahsInJuz, validateAyatRange,
} from "@/lib/quran";
import type { JuzPart } from "@/lib/quran";
import type { RecitationKind, RecitationQuality } from "@/lib/types";
import { notify } from "@/lib/toast";
import { groupIds, sortGroups } from "@/lib/groupBy";
import Modal from "@/components/Modal";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";
import DayGroups from "@/components/DayGroups";
import Alert from "@/components/Alert";
import RangeBar from "@/components/RangeBar";
import { useHistoryRange } from "@/lib/useHistoryRange";
import { Field, FormGroup } from "@/components/FormSection";

type RecInput = Parameters<ReturnType<typeof useStore.getState>["addRecitation"]>[0];

const QUALITY_BADGE: Record<RecitationQuality, string> = {
  Lancar: "badge-ok", Cukup: "badge-warn", "Perlu diulang": "badge-bad",
};

function SetoranForm({
  students, initialId, onClose,
}: { students: { id: string; name: string }[]; initialId?: string; onClose: () => void }) {
  const { addRecitation } = useStore();
  const today = useToday();
  const [sid, setSid] = useState(initialId ?? students[0]?.id ?? "");
  const [pickedDate, setPickedDate] = useState("");
  const [kind, setKind] = useState<RecitationKind>("Setoran baru");
  const [juz, setJuz] = useState(30); // 0 = semua juz
  const [surahNo, setSurahNo] = useState(0); // 0 = surah pertama di daftar, -1 = tulis manual
  const [manualName, setManualName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [quality, setQuality] = useState<RecitationQuality>("Lancar");
  const [overlap, setOverlap] = useState<{ msg: string; retry: () => void } | null>(null);

  const date = pickedDate || today;
  const options: JuzPart[] = juz
    ? surahsInJuz(juz)
    : SURAHS.map(([name, ayat], i) => ({ no: i + 1, name, from: 1, to: ayat }));
  const manual = surahNo === -1;
  const cur = options.find((o) => o.no === surahNo) ?? options[0];
  const matched = manual ? matchSurah(manualName) : 0;
  const reset = () => { setFrom(""); setTo(""); setOverlap(null); };

  function send(input: RecInput, confirmOverlap = false) {
    const r = addRecitation(confirmOverlap ? { ...input, confirmOverlap: true } : input);
    if (r.ok) onClose();
    else if (r.code === "overlap") setOverlap({ msg: r.error, retry: () => send(input, true) });
  }

  function save() {
    if (!sid || !date) return;
    if (!from || !to) return notify("warning", "Isi ayat awal dan ayat akhir.");
    const f = Number(from);
    const t = Number(to);
    if (!manual) {
      const rangeError = validateAyatRange(cur.no, f, t);
      if (rangeError) return notify("warning", rangeError);
      if (juz && (f < cur.from || t > cur.to))
        return notify("warning", `Di Juz ${juz}, ${isolateAr(surahLabel(cur.no))} hanya ayat ${cur.from}–${cur.to}. Pilih "Semua juz" bila rentangnya melewati batas juz.`);
    }
    send({
      studentId: sid, date, kind, surahNo: manual ? 0 : cur.no,
      surahName: manual ? manualName : undefined, from: f, to: t, quality,
    });
  }

  return (
    <Modal
      size="lg"
      title="Catat setoran"
      onClose={onClose}
      dirty={!!(from || to || manualName)}
      saveLabel="Catat setoran"
      onSave={save}
    >
      <div className="space-y-3">
        {overlap && (
          <Alert type="warning">
            <p>{overlap.msg}</p>
            <button className="mt-2 rounded-lg border border-amber-400 bg-white px-3 py-1 text-sm" onClick={overlap.retry}>
              Tetap catat sebagai setoran baru
            </button>
          </Alert>
        )}
        <FormGroup step={1} title="Siapa dan kapan">
          <Field label="Santri">
            <select className="w-full" value={sid} onChange={(e) => setSid(e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Tanggal">
            <input type="date" className="w-full" value={date} onChange={(e) => setPickedDate(e.target.value)} />
          </Field>
          <Field label="Jenis">
            <select className="w-full" value={kind} onChange={(e) => setKind(e.target.value as RecitationKind)}>
              {RECITATION_KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
        </FormGroup>

        <FormGroup step={2} title="Hafalan" hint='Pilih juz untuk mempersempit daftar surah, atau "Semua juz" bila rentangnya melewati batas juz.'>
          <Field label="Juz">
            <select
              className="w-full"
              value={juz}
              onChange={(e) => { setJuz(Number(e.target.value)); if (!manual) setSurahNo(0); reset(); }}
            >
              <option value={0}>Semua juz</option>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => <option key={j} value={j}>Juz {j}</option>)}
            </select>
          </Field>
          <Field label="Surah">
            <select
              dir="ltr"
              className="w-full"
              value={manual ? -1 : cur.no}
              onChange={(e) => { setSurahNo(Number(e.target.value)); reset(); }}
            >
              {options.map((o) => (
                <option key={o.no} value={o.no}>{surahOption(o.no, juz ? `ayat ${o.from}–${o.to}` : `${o.to} ayat`)}</option>
              ))}
              <option value={-1}>Tulis manual…</option>
            </select>
          </Field>
          {manual && (
            <Field label="Nama surah (manual)">
              <input dir="auto" className="w-full" maxLength={50} value={manualName} onChange={(e) => setManualName(e.target.value)} />
            </Field>
          )}
          <Field label={manual ? "Ayat awal" : `Ayat awal (${cur.from}–${cur.to})`}>
            <input type="number" className="w-full" min={manual ? 1 : cur.from} max={manual ? 286 : cur.to} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={manual ? "Ayat akhir" : `Ayat akhir (${cur.from}–${cur.to})`}>
            <input type="number" className="w-full" min={manual ? 1 : cur.from} max={manual ? 286 : cur.to} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          {manual && manualName.trim() && (
            <p className="text-xs text-slate-600 sm:col-span-2 lg:col-span-3">
              {matched > 0 ? (
                <>
                  Cocok dengan surah ke-{matched}: <bdi lang="ar" dir="rtl">{surahArabic(matched)}</bdi> ({SURAHS[matched - 1][1]} ayat).
                  Dihitung ke juz dan pemeriksaan tumpang tindih.
                </>
              ) : "Tidak cocok dengan daftar. Dicatat sebagai surah manual (tidak masuk perhitungan juz)."}
            </p>
          )}
        </FormGroup>

        <FormGroup step={3} title="Penilaian">
          <Field label="Kualitas atau kelancaran">
            <select className="w-full" value={quality} onChange={(e) => setQuality(e.target.value as RecitationQuality)}>
              {RECITATION_QUALITIES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </FormGroup>
      </div>
    </Modal>
  );
}

function SetoranHistory({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useStore();
  const h = useHistoryRange();
  const s = data.students[studentId];
  const all = data.recitations.filter((r) => r.studentId === studentId);
  const items = all.filter((r) => h.keep(r.date));
  return (
    <Modal size="lg" title={`Riwayat setoran: ${s.name}`} subtitle={data.groups[s.groupId].name} cancelLabel="Tutup" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-600">
        Dihafal {totalMemorized(data.recitations, studentId)} ayat. {juzText(data.recitations, studentId)}. (Dihitung dari seluruh catatan.)
      </p>
      <div className="mb-3"><RangeBar h={h} shown={items.length} total={all.length} noun="setoran" /></div>
      {items.length === 0 && <p className="text-sm text-slate-500">Tidak ada setoran pada rentang ini.</p>}
      <DayGroups
        items={items}
        getIso={(r) => r.date}
        render={(r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-white px-3 py-2 text-sm">
            <span className="badge badge-accent">{r.kind}</span>
            <bdi lang="ar" dir="rtl" className="text-base">{surahLabel(r.surahNo, r.surah)}</bdi>
            <span>{r.from}–{r.to}</span>
            {r.surahNo === 0 && <span className="badge">manual</span>}
            <span className={`badge ml-auto ${QUALITY_BADGE[r.quality]}`}>{r.quality}</span>
          </div>
        )}
      />
    </Modal>
  );
}

export default function Setoran() {
  const { data } = useStore();
  const user = useUser();
  const today = useToday();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [hist, setHist] = useState<string | null>(null);

  const rtqIds = myStudentIds(data, user).filter((id) => data.groups[data.students[id].groupId].unit === "RTQ");
  const hasRtq = myGroupIds(data, user).some((g) => data.groups[g].unit === "RTQ") || user.role === "wali";
  const canRecord = user.role === "pendidik" && rtqIds.length > 0;
  const needle = q.trim().toLowerCase();
  const shown = rtqIds.filter((id) => !needle || data.students[id].name.toLowerCase().includes(needle));
  const forceOpen = needle !== "";
  const days = new Set(lastDays(today, 7));
  const all = groupIds(data, rtqIds);
  const vis = groupIds(data, shown);
  const keys = sortGroups(data, forceOpen ? vis.keys() : all.keys());
  const acc: AccGroup[] = keys.map((gid) => {
    const list = all.get(gid) ?? [];
    const idle = list.filter((id) => !data.recitations.some((r) => r.studentId === id && days.has(r.date))).length;
    return { id: gid, title: data.groups[gid].name, total: list.length, chips: [{ label: "belum menyetor 7 hari", n: idle, cls: "badge-warn" }] };
  });

  if (!hasRtq)
    return (
      <div className="space-y-3">
        <h1>Setoran hafalan</h1>
        <p className="card p-3 text-sm text-slate-600">Setoran hafalan hanya untuk peserta RTQ. Tidak ada peserta RTQ dalam cakupan Anda.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Setoran hafalan</h1>
        {canRecord && (
          <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => setForm({})}>Catat setoran</button>
        )}
      </div>

      <div className="card p-3">
        <input className="w-full" placeholder="Cari nama santri…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama santri" />
      </div>

      <GroupAccordion
        groups={acc}
        forceOpen={forceOpen}
        noun="santri"
        render={(gid) => (
          <ul className="divide-y">
            {(vis.get(gid) ?? []).map((id) => {
              const s = data.students[id];
              const n = data.recitations.filter((r) => r.studentId === id).length;
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">{juzText(data.recitations, id)}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {n} catatan · <b className="text-slate-900">{totalMemorized(data.recitations, id)}</b> ayat dihafal
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border px-3 py-1.5 text-sm" disabled={n === 0} onClick={() => setHist(id)}>Riwayat</button>
                    {canRecord && <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => setForm({ id })}>Catat</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      />
      {acc.length === 0 && <p className="card p-4 text-sm text-slate-500">Tidak ada santri yang cocok.</p>}
      <p className="text-xs text-slate-500">
        Dihitung dari setoran baru berkualitas Lancar atau Cukup. Surah manual yang namanya cocok dengan daftar dihitung seperti
        surah biasa. Yang tidak cocok hanya dihitung sebagai ayat, tanpa juz. Aturan ini menunggu pengesahan ustadz pembina.
      </p>

      {form && <SetoranForm students={rtqIds.map((id) => data.students[id])} initialId={form.id} onClose={() => setForm(null)} />}
      {hist && <SetoranHistory studentId={hist} onClose={() => setHist(null)} />}
    </div>
  );
}