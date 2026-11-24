"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { rtqKey } from "@/lib/rtq";
import {
  BIO_FIELDS, CAPAIAN_FIELDS, DIMENSI_FIELDS, RATINGS, RATING_HELP, RATING_LABEL,
  emptyBio, newTkqReport, paiProgress, paiTotals, reportProblemsTkq,
} from "@/lib/tkq";
import type { PaiSection, Quarter, Rating, StudentBio, TkqContent } from "@/lib/types";
import { Field } from "./FormSection";
import ReportSection, { ProgressBadge } from "./ReportSection";
import { StatusSteps } from "./ReportStatus";
import Modal from "./Modal";

const RATING_ON: Record<Rating, string> = {
  BB: "bg-red-600 text-white",
  MB: "bg-amber-500 text-white",
  BSH: "bg-emerald-600 text-white",
  BSB: "bg-blue-600 text-white",
};


function PaiBlock({
  sec, pai, onRate, onFill,
}: { sec: PaiSection; pai: Record<string, Rating>; onRate: (id: string, r: Rating) => void; onFill: (sec: PaiSection, r: Rating) => void }) {
  const [fill, setFill] = useState<Rating>("BSH");
  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-sm">
        <span className="text-slate-600">Isi yang belum dinilai dengan</span>
        <select className="text-sm" value={fill} onChange={(e) => setFill(e.target.value as Rating)} aria-label="Nilai pengisian cepat">
          {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button className="rounded-lg border px-3 py-1 text-sm" onClick={() => onFill(sec, fill)}>Terapkan</button>
      </div>
      <div>
        {sec.items.map((i) =>
          i.heading ? (
            <div key={i.id} className="mt-2 border-b pb-1 text-sm font-semibold text-slate-700">{i.text}</div>
          ) : (
            <div key={i.id} className="flex flex-wrap items-center gap-2 border-b py-1.5 last:border-0">
              <span className="min-w-0 flex-1 text-sm">{i.text}</span>
              <div role="radiogroup" aria-label={i.text} className="inline-flex overflow-hidden rounded-lg border">
                {RATINGS.map((r) => (
                  <button
                    key={r}
                    role="radio"
                    aria-checked={pai[i.id] === r}
                    title={RATING_LABEL[r]}
                    className={`px-2.5 py-1 text-xs font-semibold ${pai[i.id] === r ? RATING_ON[r] : "bg-white text-slate-600"}`}
                    onClick={() => onRate(i.id, r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </>
  );
}

export function BioEditor({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data, saveStudentBio } = useStore();
  const s = data.students[studentId];
  const [b, setB] = useState<StudentBio>({ ...emptyBio(), ...(s.bio ?? {}) });
  const [initial] = useState(() => JSON.stringify(b));
  const groups = [...new Set(BIO_FIELDS.map((f) => f.group))];

  return (
    <Modal
      size="lg"
      title={`Biodata: ${s.name}`}
      subtitle="Data pribadi anak dan orang tua. Terlihat oleh PIC, guru kelas, dan direktur."
      onClose={onClose}
      dirty={JSON.stringify(b) !== initial}
      saveLabel="Simpan biodata"
      onSave={() => {
        if (saveStudentBio(studentId, b).ok) onClose();
      }}
    >
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g} className="card space-y-3 p-4">
            <h3>{g}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {BIO_FIELDS.filter((f) => f.group === g).map((f) => (
                <Field key={f.key} label={f.label}>
                  {f.key === "gender" ? (
                    <select className="w-full" value={b.gender} onChange={(e) => setB({ ...b, gender: e.target.value })}>
                      <option value="">Pilih</option>
                      <option>Laki-laki</option>
                      <option>Perempuan</option>
                    </select>
                  ) : (
                    <input
                      className="w-full"
                      type={f.key === "birthDate" ? "date" : "text"}
                      inputMode={f.key === "phone" || f.key === "childNo" ? "tel" : undefined}
                      value={b[f.key]}
                      onChange={(e) => setB({ ...b, [f.key]: e.target.value })}
                    />
                  )}
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function TkqEditor({ studentId, quarter, onClose }: { studentId: string; quarter: Quarter; onClose: () => void }) {
  const { data, saveTkqDraft } = useStore();
  const year = data.academic.year;
  const s = data.students[studentId];
  const tpl = data.paiTemplate;
  const existing = data.tkqReports[rtqKey(studentId, year, quarter)] ?? newTkqReport(studentId, year, quarter);
  const [f, setF] = useState<TkqContent>({
    usia: existing.usia, pai: existing.pai, capaian: existing.capaian,
    pertumbuhan: existing.pertumbuhan, projek: existing.projek,
  });
  const [initial] = useState(() => JSON.stringify(f));

  const rate = (id: string, r: Rating) => {
    const pai = { ...f.pai };
    if (pai[id] === r) delete pai[id];
    else pai[id] = r;
    setF({ ...f, pai });
  };
  const fillSection = (sec: PaiSection, r: Rating) => {
    const pai = { ...f.pai };
    for (const i of sec.items) if (!i.heading && !pai[i.id]) pai[i.id] = r;
    setF({ ...f, pai });
  };
  const grow = (k: "bb" | "tb" | "lk", raw: string) =>
    setF({ ...f, pertumbuhan: { ...f.pertumbuhan, [k]: raw === "" ? null : Number(raw) } });

  const prog = paiProgress(tpl, f.pai);
  const totals = paiTotals(tpl, f.pai);
  const capDone = CAPAIAN_FIELDS.filter(([k]) => f.capaian[k].trim()).length;
  const dimDone = DIMENSI_FIELDS.filter(([k]) => f.projek.dimensi[k].trim()).length + (f.projek.topik.trim() ? 1 : 0);
  const done = totals.done + capDone + dimDone;
  const total = totals.total + CAPAIAN_FIELDS.length + DIMENSI_FIELDS.length + 1;
  const ready = reportProblemsTkq({ ...existing, ...f }, tpl).length === 0;

  return (
    <Modal
      size="xl"
      title={`Rapor TKQ: ${s.name}`}
      subtitle={`Kuartal ${quarter} · Tahun ajaran ${year}`}
      onClose={onClose}
      dirty={JSON.stringify(f) !== initial}
      saveLabel="Simpan draft"
      onSave={() => {
        if (saveTkqDraft(studentId, quarter, f).ok) onClose();
      }}
      footerNote={
        <span className={ready ? "text-emerald-700" : "text-amber-800"}>
          {ready ? "Semua isian wajib lengkap." : "Lengkapi bagian bertanda kuning."}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="card space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusSteps status={existing.status} />
            <span className={`badge ml-auto ${ready ? "badge-ok" : "badge-warn"}`}>{ready ? "Siap diajukan" : "Belum lengkap"}</span>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-600">
              <span>Kelengkapan isian wajib</span>
              <b>{done} dari {total}</b>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-accent" style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>
        </div>

        <ReportSection title="Penilaian PAI (BB / MB / BSH / BSB)" badge={<ProgressBadge done={totals.done} total={totals.total} />}>
          <details className="rounded-lg border bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium">Panduan penilaian</summary>
            <ul className="mt-2 space-y-1">
              {RATINGS.map((r) => (
                <li key={r}><b>{r} ({RATING_LABEL[r]}):</b> {RATING_HELP[r]}</li>
              ))}
            </ul>
          </details>
          {tpl.map((sec) => {
            const p = prog.find((x) => x.id === sec.id)!;
            return (
              <ReportSection key={sec.id} title={`${sec.no}. ${sec.title}`} badge={<ProgressBadge done={p.done} total={p.total} />} defaultOpen={p.done < p.total}>
                <PaiBlock sec={sec} pai={f.pai} onRate={rate} onFill={fillSection} />
              </ReportSection>
            );
          })}
        </ReportSection>

        <ReportSection title="Capaian pembelajaran" badge={<ProgressBadge done={capDone} total={CAPAIAN_FIELDS.length} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kelompok usia">
              <input className="w-full" maxLength={30} value={f.usia} onChange={(e) => setF({ ...f, usia: e.target.value })} />
            </Field>
          </div>
          {CAPAIAN_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <textarea className="w-full" rows={5} maxLength={2000} value={f.capaian[k]}
                onChange={(e) => setF({ ...f, capaian: { ...f.capaian, [k]: e.target.value } })} />
            </Field>
          ))}
        </ReportSection>

        <ReportSection title="Pertumbuhan" badge={<span className="badge">Opsional</span>} defaultOpen={false}>
          <div className="grid gap-3 sm:grid-cols-3">
            {([["bb", "Berat badan (kg)"], ["tb", "Tinggi badan (cm)"], ["lk", "Lingkar kepala (cm)"]] as const).map(([k, label]) => (
              <Field key={k} label={label}>
                <input type="number" step="0.1" className="w-full" value={f.pertumbuhan[k] ?? ""} onChange={(e) => grow(k, e.target.value)} />
              </Field>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Projek profil pelajar" badge={<ProgressBadge done={dimDone} total={DIMENSI_FIELDS.length + 1} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Topik">
              <input className="w-full" maxLength={100} value={f.projek.topik}
                onChange={(e) => setF({ ...f, projek: { ...f.projek, topik: e.target.value } })} />
            </Field>
            <Field label="Fase">
              <input className="w-full" maxLength={30} value={f.projek.fase}
                onChange={(e) => setF({ ...f, projek: { ...f.projek, fase: e.target.value } })} />
            </Field>
          </div>
          {DIMENSI_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <textarea className="w-full" rows={4} maxLength={1500} value={f.projek.dimensi[k]}
                onChange={(e) => setF({ ...f, projek: { ...f.projek, dimensi: { ...f.projek.dimensi, [k]: e.target.value } } })} />
            </Field>
          ))}
        </ReportSection>
      </div>
    </Modal>
  );
}