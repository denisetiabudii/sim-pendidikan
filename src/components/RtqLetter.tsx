"use client";
import { Fragment } from "react";
import { useStore } from "@/lib/store";
import {
  AKHLAK_LEGEND, BANDS, MAX_ROWS, PREDIKAT, absenceCounts, fmtNum, rowName, rtqKey,
  tahfidzAverage, tahfidzPredikat, ziyadah,
} from "@/lib/rtq";
import type { Quarter, RtqAspect } from "@/lib/types";
import { Kop } from "./ReportParts";

function AspectTable({ title, items }: { title: string; items: [string, RtqAspect][] }) {
  return (
    <table className="rp-table">
      <thead>
        <tr><th colSpan={3} className="hd">{title}</th></tr>
        <tr>
          <th className="th">Aspek Penilaian</th>
          <th className="th">Keterangan</th>
          <th className="th w-p">Predikat</th>
        </tr>
      </thead>
      <tbody>
        {items.map(([label, a]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{a.text}</td>
            <td className="c">{a.predikat}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Dua dokumen: (1) akhlak dan tahsin, (2) tahfidz. Masing-masing mulai di halaman baru saat dicetak.
export default function RtqLetter({ studentId, quarter }: { studentId: string; quarter: Quarter }) {
  const { data } = useStore();
  const { institution: ins, academic } = data;
  const s = data.students[studentId];
  const g = data.groups[s.groupId];
  const r = data.rtqReports[rtqKey(studentId, academic.year, quarter)];
  if (!r) return null;

  const q = academic.quarters[quarter - 1];
  const abs = r.absence ?? absenceCounts(data, studentId, q.start, q.end);
  const avg = tahfidzAverage(r.tahfidz);
  const band = tahfidzPredikat(avg);
  const teacher = Object.values(data.users).find((u) => u.role === "pendidik" && u.groupIds?.includes(s.groupId));
  const signDate = new Date(`${q.signDate}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

  return (
    <section className="rp">
      <div className="rp-sheet">
        <Kop ins={ins} />
        <h2 className="rp-title">DAFTAR NILAI EVALUASI KUARTAL {quarter}<br />TAHUN AJARAN {academic.year}</h2>
        <div className="rp-pairs">
          <div className="rp-pair"><span className="rp-k">Nama Lengkap Santri</span><span>:</span><span className="rp-v">{s.name}</span></div>
          <div className="rp-pair"><span className="rp-k">Nama Halaqah</span><span>:</span><span className="rp-v">{g.name}</span></div>
        </div>

        <AspectTable title="NILAI AKHLAK" items={[["Tutur Kata", r.akhlak.tuturKata], ["Sikap", r.akhlak.sikap]]} />
        <AspectTable
          title="NILAI TAHSIN"
          items={[["Kelancaran", r.tahsin.kelancaran], ["Makhroj & Sifatul Huruf", r.tahsin.makhraj], ["Hukum Tajwid", r.tahsin.tajwid]]}
        />

        <table className="rp-table xs">
          <thead><tr><th colSpan={4} className="hd">KETERANGAN PREDIKAT NILAI AKHLAK</th></tr></thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i}>
                {[PREDIKAT[i], PREDIKAT[i + 4]].map((p) => (
                  <Fragment key={p}>
                    <td className="w-p">{p}</td>
                    <td>{AKHLAK_LEGEND[p]}</td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rp-sheet">
        <Kop ins={ins} />
        <table className="rp-table">
          <thead>
            <tr><th colSpan={5} className="hd">NILAI TAHFIDZ</th></tr>
            <tr>
              <th className="th w-no">No</th>
              <th className="th">Nama Surat</th>
              <th className="th">Ayat</th>
              <th className="th">Nilai Harian</th>
              <th className="th">Nilai Evaluasi</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: MAX_ROWS }, (_, i) => r.tahfidz[i]).map((row, i) => (
              <tr key={i}>
                <td className="c">{i + 1}</td>
                <td className="c ar" dir="rtl" lang="ar">{row ? rowName(row) : ""}</td>
                <td className="c">{row ? `${row.from} - ${row.to}` : ""}</td>
                <td className="c">{row?.harian ?? ""}</td>
                <td className="c">{row?.evaluasi ?? ""}</td>
              </tr>
            ))}
            <tr>
              <td className="orange" colSpan={2}>RATA-RATA NILAI</td>
              <td className="orange">{band?.predikat ?? "–"}</td>
              <td className="orange">{fmtNum(avg)}</td>
              <td className="orange" style={{ textTransform: "uppercase" }}>{band?.name ?? ""}</td>
            </tr>
          </tbody>
        </table>

        <table className="rp-table">
          <thead>
            <tr>
              <th className="hd" colSpan={2}>Ketidakhadiran</th>
              <th className="hd">Jumlah Ziyadah</th>
              <th className="hd">Catatan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Sakit</td>
              <td>{abs.sakit} hari</td>
              <td rowSpan={3} className="c m">{ziyadah(r.tahfidz)} Ayat</td>
              <td rowSpan={3} className="c m">{r.catatan}</td>
            </tr>
            <tr><td>Izin</td><td>{abs.izin} hari</td></tr>
            <tr><td>Tanpa Keterangan</td><td>{abs.tanpa} hari</td></tr>
          </tbody>
        </table>

        <table className="rp-table xs">
          <thead><tr><th colSpan={6} className="hd">KETERANGAN PREDIKAT NILAI TAHSIN & TAHFIDZ</th></tr></thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i}>
                {[BANDS[i], BANDS[i + 4]].map((b) => (
                  <Fragment key={b.predikat}>
                    <td className="w-p">{b.predikat}</td>
                    <td>{b.name}</td>
                    <td>{b.min}-{b.max}</td>
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rp-sign">
          <div>
            Mudir {ins.name}
            <div className="rp-gap" />
            <u>{ins.mudir}</u>
          </div>
          <div className="r">
            {ins.city}, {signDate}
            <br />
            Pembimbing
            <div className="rp-gap" />
            <u>{teacher?.name ?? "………………"}</u>
          </div>
        </div>
      </div>
    </section>
  );
}
