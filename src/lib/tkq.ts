import type { PaiSection, Quarter, Rating, StudentBio, TkqContent, TkqReport } from "./types";
export { rtqKey as tkqKey } from "./rtq";

export const RATINGS: Rating[] = ["BB", "MB", "BSH", "BSB"];
export const RATING_LABEL: Record<Rating, string> = {
  BB: "Belum Berkembang", MB: "Mulai Berkembang", BSH: "Berkembang Sesuai Harapan", BSB: "Berkembang Sangat Baik",
};
// Definisi dari petunjuk penggunaan di berkas klien.
export const RATING_HELP: Record<Rating, string> = {
  BB: "Bila peserta didik melakukannya harus dengan bimbingan atau dicontohkan oleh guru.",
  MB: "Bila peserta didik melakukannya masih harus diingatkan oleh guru.",
  BSH: "Bila peserta didik sudah dapat melakukannya secara mandiri dan konsisten tanpa harus diingatkan atau dicontohkan oleh guru.",
  BSB: "Bila peserta didik sudah dapat melakukannya secara mandiri dan sudah dapat membantu temannya yang belum mencapai kemampuan sesuai indikator yang diharapkan.",
};

export const CAPAIAN_FIELDS = [
  ["agama", "Nilai Agama dan Budi Pekerti"],
  ["jatiDiri", "Jati Diri"],
  ["literasi", "Dasar Literasi, Matematika, Sains, Teknologi, Rekayasa & Seni"],
] as const;
export const DIMENSI_FIELDS = [
  ["iman", "Beriman dan Bertaqwa kepada Tuhan Yang Maha Esa dan Berakhlak Mulia"],
  ["kebinekaan", "Berkebinekaan Global"],
  ["gotong", "Gotong Royong"],
  ["mandiri", "Mandiri"],
  ["kreatif", "Kreatif"],
  ["nalar", "Bernalar Kritis"],
] as const;

const SURAH_PAI = [
  "Al Fatihah", "An Nas", "Al Falaq", "Al Ikhlas", "Al Lahab", "An Nashr", "Al Kafirun", "Al Kautsar",
  "Al Ma’un", "Quraisy", "Al Fil", "Al Humazah", "Al ‘Ashr", "At Takatsur", "Al Qari’ah", "Al ‘Adiyat",
  "Az Zalzalah", "Al Bayyinah", "Al Qadr", "Al ‘Alaq", "At Tiin", "Al Insyirah", "Adh Dhuha", "Al Lail",
  "Asy Syams", "Al Balad", "Al Fajr", "Al Ghasiyyah", "Al A’la", "At Thariq", "Al Buruj", "Al Insyiqaq",
];

// Baris berawalan "# " adalah sub-judul tanpa penilaian.
function section(no: string, title: string, lines: string[]): PaiSection {
  return {
    id: `s${no}`, no, title,
    items: lines.map((t, i) =>
      t.startsWith("# ")
        ? { id: `s${no}-${i + 1}`, text: t.slice(2), heading: true }
        : { id: `s${no}-${i + 1}`, text: t }
    ),
  };
}

// Indikator dari Laporan Rekapitulasi Perkembangan Anak PAI (Kelas B, Kuartal 1). Belum dikonfirmasi untuk kelas lain.
export const defaultPaiTemplate = (): PaiSection[] => [
  section("I", "AQIDAH", [
    "Mengenal kalimat syahadat beserta artinya",
    "Menghafal, menyebut, dan mengurutkan rukun Islam",
    "Menghafal, menyebut, dan mengurutkan rukun iman",
    "Mengenal macam macam ciptaan Allah",
    "Mengenal Asmaul Husna beserta artinya",
  ]),
  section("II", "AKHLAQ", [
    "# Adab terhadap orangtua",
    "Berbicara dengan sopan dan lembut kepada orang tua",
    "Mendengarkan dan menaati nasihat orang tua",
    "Menunjukkan sikap hormat dan sayang kepada orang tua",
  ]),
  section("III", "FIQIH / IBADAH", [
    "Mengurutkan secara lengkap tata cara wudhu",
    "Mempraktekkan gerakan wudhu sesuai urutannya",
    "Mengetahui doa setelah wudhu",
    "Mengenal gerakan shalat sesuai urutannya",
  ]),
  section("IV", "AL QURAN", ["Tahsin", "Tahfizh", ...SURAH_PAI.map((n) => `Surat ${n}`)]),
  section("V", "DO’A – DO’A HARIAN", [
    "Do’a sebelum makan beserta artinya",
    "Do’a setelah makan beserta artinya",
    "Do’a sebelum tidur beserta artinya",
    "Do’a bangun tidur beserta artinya",
    "Do’a agar diberi ilmu yang bermanfaat beserta artinya",
    "Do’a keluar rumah beserta artinya",
    "Do’a naik kendaraan beserta artinya",
  ]),
  section("VI", "HADITS-HADITS PILIHAN", [
    "Hadits tentang kasih sayang beserta artinya",
    "Hadits tentang taqwa beserta artinya",
    "Hadits tentang doa beserta artinya",
  ]),
];

export const ratedItems = (t: PaiSection[]) => t.flatMap((s) => s.items.filter((i) => !i.heading));

export function ratingsFor(t: PaiSection[], pick: (index: number) => Rating): Record<string, Rating> {
  const out: Record<string, Rating> = {};
  ratedItems(t).forEach((it, i) => { out[it.id] = pick(i); });
  return out;
}

export function paiProgress(t: PaiSection[], pai: Record<string, Rating>) {
  return t.map((s) => {
    const items = s.items.filter((i) => !i.heading);
    return { id: s.id, title: s.title, done: items.filter((i) => pai[i.id]).length, total: items.length };
  });
}
export function paiTotals(t: PaiSection[], pai: Record<string, Rating>) {
  const items = ratedItems(t);
  return { done: items.filter((i) => pai[i.id]).length, total: items.length };
}
// Membuang penilaian untuk indikator yang sudah tidak ada di template.
export function cleanPai(t: PaiSection[], pai: Record<string, Rating>): Record<string, Rating> {
  const ids = new Set(ratedItems(t).map((i) => i.id));
  return Object.fromEntries(Object.entries(pai).filter(([id]) => ids.has(id)));
}

export function newTkqReport(studentId: string, year: string, quarter: Quarter): TkqReport {
  return {
    studentId, year, quarter, status: "draft", version: 1, usia: "5 – 6 Tahun", pai: {},
    capaian: { agama: "", jatiDiri: "", literasi: "" },
    pertumbuhan: { bb: null, tb: null, lk: null },
    projek: {
      topik: "", fase: "Fondasi",
      dimensi: { iman: "", kebinekaan: "", gotong: "", mandiri: "", kreatif: "", nalar: "" },
    },
  };
}

const GROWTH = [
  ["bb", "Berat badan", 3, 80],
  ["tb", "Tinggi badan", 40, 170],
  ["lk", "Lingkar kepala", 30, 70],
] as const;

export function validateTkq(c: TkqContent): string | null {
  if (c.usia.length > 30 || c.projek.fase.length > 30 || c.projek.topik.length > 100) return "Isian terlalu panjang";
  if (Object.values(c.pai).some((v) => !RATINGS.includes(v))) return "Penilaian harus BB, MB, BSH, atau BSB";
  if (Object.values(c.capaian).some((t) => t.length > 2000) || Object.values(c.projek.dimensi).some((t) => t.length > 1500))
    return "Narasi terlalu panjang (capaian maks 2000, dimensi maks 1500 karakter)";
  for (const [k, label, min, max] of GROWTH) {
    const v = c.pertumbuhan[k];
    if (v !== null && (Number.isNaN(v) || v < min || v > max)) return `${label} harus antara ${min} dan ${max}`;
  }
  return null;
}

// Kelengkapan yang diwajibkan sebelum rapor diajukan.
export function reportProblemsTkq(r: TkqReport, t: PaiSection[]): string[] {
  const p: string[] = [];
  const { done, total } = paiTotals(t, r.pai);
  if (done < total) p.push(`${total - done} indikator PAI belum dinilai`);
  if (Object.values(r.capaian).some((x) => !x.trim())) p.push("Narasi capaian pembelajaran belum lengkap");
  if (!r.projek.topik.trim() || Object.values(r.projek.dimensi).some((x) => !x.trim()))
    p.push("Projek profil pelajar belum lengkap");
  return p;
}

export const BIO_FIELDS: { key: keyof StudentBio; label: string; group: string }[] = [
  { key: "nickname", label: "Nama panggilan", group: "Identitas" },
  { key: "nomorInduk", label: "Nomor induk", group: "Identitas" },
  { key: "birthPlace", label: "Tempat lahir", group: "Identitas" },
  { key: "birthDate", label: "Tanggal lahir", group: "Identitas" },
  { key: "gender", label: "Jenis kelamin", group: "Identitas" },
  { key: "religion", label: "Agama", group: "Identitas" },
  { key: "childNo", label: "Anak ke", group: "Identitas" },
  { key: "father", label: "Nama ayah", group: "Orang tua" },
  { key: "mother", label: "Nama ibu", group: "Orang tua" },
  { key: "fatherJob", label: "Pekerjaan ayah", group: "Orang tua" },
  { key: "motherJob", label: "Pekerjaan ibu", group: "Orang tua" },
  { key: "street", label: "Jalan", group: "Alamat orang tua" },
  { key: "phone", label: "Telepon / HP", group: "Alamat orang tua" },
  { key: "village", label: "Kelurahan / Desa", group: "Alamat orang tua" },
  { key: "district", label: "Kecamatan", group: "Alamat orang tua" },
  { key: "regency", label: "Kabupaten", group: "Alamat orang tua" },
  { key: "province", label: "Provinsi", group: "Alamat orang tua" },
  { key: "guardianName", label: "Nama wali", group: "Wali (bila ada)" },
  { key: "guardianJob", label: "Pekerjaan wali", group: "Wali (bila ada)" },
  { key: "guardianAddress", label: "Alamat wali", group: "Wali (bila ada)" },
];

export const emptyBio = (): StudentBio =>
  Object.fromEntries(BIO_FIELDS.map((f) => [f.key, ""])) as unknown as StudentBio;

const isDate = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
};

export function validateBio(b: StudentBio): string | null {
  for (const f of BIO_FIELDS) {
    const max = f.key === "street" || f.key === "guardianAddress" ? 200 : 100;
    if ((b[f.key] ?? "").trim().length > max) return `${f.label} terlalu panjang (maks ${max} karakter)`;
  }
  if (b.gender && !["Laki-laki", "Perempuan"].includes(b.gender)) return "Jenis kelamin tidak valid";
  if (b.birthDate && !isDate(b.birthDate)) return "Tanggal lahir tidak valid";
  if (!/^[0-9+()\-\s]{0,25}$/.test(b.phone ?? "")) return "Telepon hanya boleh berisi angka, spasi, +, -, dan tanda kurung";
  if (!/^\d{0,2}$/.test(b.childNo ?? "")) return "Anak ke harus berupa angka (maks 2 digit)";
  return null;
}