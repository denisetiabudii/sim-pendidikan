"use client";
import { Fragment } from "react";
import { useStore } from "@/lib/store";
import { absenceCounts, rtqKey } from "@/lib/rtq";
import { CAPAIAN_FIELDS, DIMENSI_FIELDS, RATINGS, RATING_HELP, RATING_LABEL, emptyBio } from "@/lib/tkq";
import type { Quarter } from "@/lib/types";
import { Kop, Narr, Pair, Pairs, Sign } from "./ReportParts";

const WORD = ["satu", "dua", "tiga"];

// Empat dokumen (sampul + identitas + petunjuk, capaian, projek, rekapitulasi PAI).
// Tiap dokumen mulai di halaman baru saat dicetak, dan mengalir ke halaman berikutnya bila panjang.
export default function TkqLetter({ studentId, quarter }: { studentId: string; quarter: Quarter }) {
  const { data } = useStore();
  const ins = data.institutionTkq;
  const ac = data.academic;
  const s = data.students[studentId];
  const g = data.groups[s.groupId];
  const r = data.tkqReports[rtqKey(studentId, ac.year, quarter)];
  if (!r) return null;

  const bio = { ...emptyBio(), ...(s.bio ?? {}) };
  const q = ac.quarters[quarter - 1];
  const abs = r.absence ?? absenceCounts(data, studentId, q.start, q.end);
  const teacher = Object.values(data.users).find((u) => u.role === "pendidik" && u.groupIds?.includes(s.groupId))?.name;
  const date = new Date(`${q.signDate}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
  const quartal = `${quarter} (${WORD[quarter - 1]})`;

  return (
    <section className="rp">
      {/* 1. Sampul, identitas, dan petunjuk dalam satu lembar */}
      <div className="rp-sheet">
        <Kop ins={ins} npsn />
        <h2 className="rp-title">LAPORAN PENILAIAN PERKEMBANGAN PESERTA DIDIK</h2>
        <p className="rp-sub">Quartal {quartal} · Tahun Ajaran {ac.year}</p>
        <Pairs>
          <Pair k="Nama Sekolah" v={ins.name} />
          <Pair k="NPSN" v={ins.nomorStatistik} />
          <Pair k="Alamat Sekolah" v={ins.address} wide />
        </Pairs>

        <h3 className="rp-h3">IDENTITAS PESERTA DIDIK</h3>
        <Pairs>
          <Pair k="Nama Lengkap" v={s.name} />
          <Pair k="Nama Panggilan" v={bio.nickname} />
          <Pair k="Nomor Induk" v={bio.nomorInduk} />
          <Pair k="Kelas" v={g.name} />
          <Pair k="Tempat, Tgl. Lahir" v={[bio.birthPlace, bio.birthDate].filter(Boolean).join(", ")} />
          <Pair k="Jenis Kelamin" v={bio.gender} />
          <Pair k="Agama" v={bio.religion} />
          <Pair k="Anak Ke" v={bio.childNo} />
          <Pair k="Nama Ayah" v={bio.father} />
          <Pair k="Nama Ibu" v={bio.mother} />
          <Pair k="Pekerjaan Ayah" v={bio.fatherJob} />
          <Pair k="Pekerjaan Ibu" v={bio.motherJob} />
        </Pairs>
        <h3 className="rp-h3">Alamat Orang Tua</h3>
        <Pairs>
          <Pair k="Jalan" v={bio.street} wide />
          <Pair k="Telepon / HP" v={bio.phone} />
          <Pair k="Kelurahan / Desa" v={bio.village} />
          <Pair k="Kecamatan" v={bio.district} />
          <Pair k="Kabupaten" v={bio.regency} />
          <Pair k="Provinsi" v={bio.province} />
        </Pairs>
        <h3 className="rp-h3">Wali Peserta Didik</h3>
        <Pairs>
          <Pair k="Nama Wali" v={bio.guardianName} />
          <Pair k="Pekerjaan Wali" v={bio.guardianJob} />
          <Pair k="Alamat Wali" v={bio.guardianAddress} wide />
        </Pairs>

        <h3 className="rp-h3">PETUNJUK PENGGUNAAN</h3>
        <ul className="rp-ul">
          <li>Laporan ini disampaikan kepada orang tua empat bulan sekali sebagai laporan tumbuh kembang anak, dan menjadi rujukan bagi sekolah, guru, serta pihak terkait.</li>
          <li>Laporan disusun dari hasil pengamatan guru dan informasi dari orang tua. Setiap anak berkembang dengan laju yang berbeda.</li>
          <li>Capaian ditulis dengan narasi. Hafalan dan indikator Pendidikan Agama Islam memakai ceklis empat capaian berikut:</li>
        </ul>
        <table className="rp-table sm">
          <tbody>
            {RATINGS.map((x) => (
              <tr key={x}>
                <td className="c b w-p">{x}</td>
                <td><b>{RATING_LABEL[x]}</b>: {RATING_HELP[x]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rp-sign">
          <span />
          <div className="r">
            {ins.city}, {date}
            <br />
            Kepala {ins.name}
            <div className="rp-gap" />
            <u>{ins.mudir}</u>
          </div>
        </div>
      </div>

      {/* 2. Capaian pembelajaran */}
      <div className="rp-sheet">
        <Kop ins={ins} npsn />
        <h2 className="rp-title">LAPORAN CAPAIAN PEMBELAJARAN PESERTA DIDIK</h2>
        <p className="rp-sub">Tahun pelajaran {ac.year}</p>
        <Pairs>
          <Pair k="Nama Peserta Didik" v={s.name} />
          <Pair k="Kelompok Usia" v={r.usia} />
          <Pair k="Nomor Induk" v={bio.nomorInduk} />
          <Pair k="Quartal" v={quartal} />
        </Pairs>
        {CAPAIAN_FIELDS.map(([k, label]) => (
          <Narr key={k} title={`Capaian Pembelajaran ${label}`} text={r.capaian[k]} />
        ))}
        <div className="rp-two">
          <table className="rp-table">
            <thead><tr><th colSpan={2} className="hd">Kehadiran</th></tr></thead>
            <tbody>
              <tr><td>Sakit</td><td>{abs.sakit} hari</td></tr>
              <tr><td>Izin</td><td>{abs.izin} hari</td></tr>
              <tr><td>Tanpa Keterangan</td><td>{abs.tanpa} hari</td></tr>
            </tbody>
          </table>
          <table className="rp-table">
            <thead><tr><th colSpan={2} className="hd">Pertumbuhan</th></tr></thead>
            <tbody>
              <tr><td>Berat Badan</td><td>{r.pertumbuhan.bb ?? "–"} kg</td></tr>
              <tr><td>Tinggi Badan</td><td>{r.pertumbuhan.tb ?? "–"} cm</td></tr>
              <tr><td>Lingkar Kepala</td><td>{r.pertumbuhan.lk ?? "–"} cm</td></tr>
            </tbody>
          </table>
        </div>
        <Sign ins={ins} teacher={teacher} date={date} role="Guru Kelas" />
        <div className="rp-box">
          <b>Refleksi Orang Tua</b>
          <div className="sp" />
          <div style={{ textAlign: "right" }}>
            {ins.city}, …………………
            <br />
            Orang tua siswa
            <div className="rp-gap" />
            (………………………………)
          </div>
        </div>
      </div>

      {/* 3. Projek profil pelajar */}
      <div className="rp-sheet">
        <Kop ins={ins} npsn />
        <h2 className="rp-title">LAPORAN PENGUATAN PROJEK PROFIL PELAJAR PANCASILA</h2>
        <p className="rp-sub">Tahun pelajaran {ac.year}</p>
        <Pairs>
          <Pair k="Nama Peserta Didik" v={s.name} />
          <Pair k="Kelompok Usia" v={r.usia} />
          <Pair k="Nomor Induk" v={bio.nomorInduk} />
          <Pair k="Quartal" v={quartal} />
          <Pair k="Topik" v={r.projek.topik} />
          <Pair k="Fase" v={r.projek.fase} />
        </Pairs>
        {DIMENSI_FIELDS.map(([k, label]) => (
          <Narr key={k} title={label} text={r.projek.dimensi[k]} />
        ))}
        <Sign ins={ins} teacher={teacher} date={date} role="Guru Kelas" />
      </div>

      {/* 4. Rekapitulasi PAI */}
      <div className="rp-sheet">
        <Kop ins={ins} npsn />
        <h2 className="rp-title">LAPORAN REKAPITULASI PERKEMBANGAN ANAK<br />PENDIDIKAN AGAMA ISLAM</h2>
        <Pairs>
          <Pair k="Nama Anak" v={s.name} />
          <Pair k="Kelompok" v={g.name} />
          <Pair k="Nomor Induk" v={bio.nomorInduk} />
          <Pair k="Quartal / Tahun Ajaran" v={`${quartal} / ${ac.year}`} />
        </Pairs>
        <table className="rp-table xs">
          <thead>
            <tr>
              <th className="hd w-no">NO</th>
              <th className="hd">RUANG LINGKUP PENDIDIKAN AGAMA ISLAM</th>
              {RATINGS.map((x) => <th key={x} className="hd w-r">{x}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.paiTemplate.map((sec) => (
              <Fragment key={sec.id}>
                <tr>
                  <td className="shade c">{sec.no}</td>
                  <td className="shade" colSpan={5}>{sec.title}</td>
                </tr>
                {sec.items.map((i) =>
                  i.heading ? (
                    <tr key={i.id}><td /><td className="b" colSpan={5}>{i.text}</td></tr>
                  ) : (
                    <tr key={i.id}>
                      <td />
                      <td>{i.text}</td>
                      {RATINGS.map((x) => (
                        <td key={x} className="c b">{r.pai[i.id] === x ? "✓" : ""}</td>
                      ))}
                    </tr>
                  )
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        <p className="rp-note">{RATINGS.map((x) => `${x}: ${RATING_LABEL[x]}`).join("   ·   ")}</p>
        <div className="rp-sign">
          <div>Orang Tua/Wali<div className="rp-gap" />………………</div>
          <div className="ctr">Wali Kelas<div className="rp-gap" /><u>{teacher ?? "………………"}</u></div>
          <div className="r">
            {ins.city}, {date}
            <br />
            Mudir {ins.name}
            <div className="rp-gap" />
            <u>{ins.mudir}</u>
          </div>
        </div>
      </div>
    </section>
  );
}
