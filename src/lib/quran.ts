// Jumlah ayat per surah, mushaf standar Indonesia (riwayat Hafs, total 6.236 ayat).
// Urutan sesuai nomor surah 1–114. Konfirmasi dengan ustadz pembina sebelum dipakai resmi.
export const SURAHS: ReadonlyArray<readonly [string, number]> = [
  ["Al-Fatihah", 7], ["Al-Baqarah", 286], ["Ali Imran", 200], ["An-Nisa", 176], ["Al-Maidah", 120], ["Al-Anam", 165],
  ["Al-Araf", 206], ["Al-Anfal", 75], ["At-Taubah", 129], ["Yunus", 109], ["Hud", 123], ["Yusuf", 111],
  ["Ar-Rad", 43], ["Ibrahim", 52], ["Al-Hijr", 99], ["An-Nahl", 128], ["Al-Isra", 111], ["Al-Kahf", 110],
  ["Maryam", 98], ["Taha", 135], ["Al-Anbiya", 112], ["Al-Hajj", 78], ["Al-Muminun", 118], ["An-Nur", 64],
  ["Al-Furqan", 77], ["Asy-Syuara", 227], ["An-Naml", 93], ["Al-Qasas", 88], ["Al-Ankabut", 69], ["Ar-Rum", 60],
  ["Luqman", 34], ["As-Sajdah", 30], ["Al-Ahzab", 73], ["Saba", 54], ["Fatir", 45], ["Yasin", 83],
  ["As-Saffat", 182], ["Sad", 88], ["Az-Zumar", 75], ["Gafir", 85], ["Fussilat", 54], ["Asy-Syura", 53],
  ["Az-Zukhruf", 89], ["Ad-Dukhan", 59], ["Al-Jasiyah", 37], ["Al-Ahqaf", 35], ["Muhammad", 38], ["Al-Fath", 29],
  ["Al-Hujurat", 18], ["Qaf", 45], ["Az-Zariyat", 60], ["At-Tur", 49], ["An-Najm", 62], ["Al-Qamar", 55],
  ["Ar-Rahman", 78], ["Al-Waqiah", 96], ["Al-Hadid", 29], ["Al-Mujadalah", 22], ["Al-Hasyr", 24], ["Al-Mumtahanah", 13],
  ["As-Saff", 14], ["Al-Jumuah", 11], ["Al-Munafiqun", 11], ["At-Tagabun", 18], ["At-Talaq", 12], ["At-Tahrim", 12],
  ["Al-Mulk", 30], ["Al-Qalam", 52], ["Al-Haqqah", 52], ["Al-Maarij", 44], ["Nuh", 28], ["Al-Jinn", 28],
  ["Al-Muzzammil", 20], ["Al-Muddassir", 56], ["Al-Qiyamah", 40], ["Al-Insan", 31], ["Al-Mursalat", 50], ["An-Naba", 40],
  ["An-Naziat", 46], ["Abasa", 42], ["At-Takwir", 29], ["Al-Infitar", 19], ["Al-Mutaffifin", 36], ["Al-Insyiqaq", 25],
  ["Al-Buruj", 22], ["At-Tariq", 17], ["Al-Ala", 19], ["Al-Gasyiyah", 26], ["Al-Fajr", 30], ["Al-Balad", 20],
  ["Asy-Syams", 15], ["Al-Lail", 21], ["Ad-Duha", 11], ["Al-Insyirah", 8], ["At-Tin", 8], ["Al-Alaq", 19],
  ["Al-Qadr", 5], ["Al-Bayyinah", 8], ["Az-Zalzalah", 8], ["Al-Adiyat", 11], ["Al-Qariah", 11], ["At-Takasur", 8],
  ["Al-Asr", 3], ["Al-Humazah", 9], ["Al-Fil", 5], ["Quraisy", 4], ["Al-Maun", 7], ["Al-Kausar", 3],
  ["Al-Kafirun", 6], ["An-Nasr", 3], ["Al-Masad", 5], ["Al-Ikhlas", 4], ["Al-Falaq", 5], ["An-Nas", 6],
];

export interface SurahInfo {
  no: number;
  name: string;
  ayat: number;
}

export function surahByNo(no: number): SurahInfo | undefined {
  if (!Number.isInteger(no) || no < 1 || no > SURAHS.length) return undefined;
  const [name, ayat] = SURAHS[no - 1];
  return { no, name, ayat };
}

// Mengembalikan pesan error, atau null bila rentang valid.
export function validateAyatRange(no: number, from: number, to: number): string | null {
  const s = surahByNo(no);
  if (!s) return "Surah tidak valid";
  if (!Number.isInteger(from) || !Number.isInteger(to)) return "Ayat harus berupa bilangan bulat";
  if (from < 1 || to < from) return "Ayat awal minimal 1 dan ayat akhir tidak boleh lebih kecil dari ayat awal";
  if (to > s.ayat) return `${s.name} hanya memiliki ${s.ayat} ayat`;
  return null;
}

// Awal tiap juz (nomor surah, ayat). Mushaf standar, riwayat Hafs. Konfirmasi dengan ustadz pembina.
export const JUZ_START: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

// Nomor urut ayat dari 1 sampai 6.236 sepanjang mushaf.
const OFFSET: number[] = (() => {
  const o = [0];
  for (const [, n] of SURAHS) o.push(o[o.length - 1] + n);
  return o;
})();
export const TOTAL_AYAT = OFFSET[OFFSET.length - 1];
export const absIndex = (surahNo: number, ayah: number) => OFFSET[surahNo - 1] + ayah;

const JUZ_ABS = JUZ_START.map(([s, a]) => absIndex(s, a));

export function juzBounds(juz: number): { start: number; end: number } {
  return { start: JUZ_ABS[juz - 1], end: juz === 30 ? TOTAL_AYAT : JUZ_ABS[juz] - 1 };
}

export function juzOf(surahNo: number, ayah: number): number {
  const i = absIndex(surahNo, ayah);
  let j = 1;
  for (let k = 0; k < JUZ_ABS.length; k++) if (i >= JUZ_ABS[k]) j = k + 1;
  return j;
}

export type Interval = [number, number];

export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

export function juzProgress(intervals: Interval[]): { juz: number; done: number; total: number }[] {
  return JUZ_ABS.map((_, i) => {
    const { start, end } = juzBounds(i + 1);
    let done = 0;
    for (const [a, b] of intervals) {
      const lo = Math.max(a, start);
      const hi = Math.min(b, end);
      if (hi >= lo) done += hi - lo + 1;
    }
    return { juz: i + 1, done, total: end - start + 1 };
  });
}

export interface JuzPart {
  no: number;
  name: string;
  from: number;
  to: number;
}

// Daftar surah yang ada di sebuah juz, beserta rentang ayat yang masuk juz itu.
export function surahsInJuz(juz: number): JuzPart[] {
  const { start, end } = juzBounds(juz);
  const out: JuzPart[] = [];
  for (let n = 1; n <= SURAHS.length; n++) {
    const lo = Math.max(start, OFFSET[n - 1] + 1);
    const hi = Math.min(end, OFFSET[n]);
    if (hi >= lo) out.push({ no: n, name: SURAHS[n - 1][0], from: lo - OFFSET[n - 1], to: hi - OFFSET[n - 1] });
  }
  return out;
}