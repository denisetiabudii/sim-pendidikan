import type { AppData } from "./types";

export const seed = (): AppData => ({
  users: {
    u1: { id: "u1", name: "Direktur Amal Pendidikan", role: "direktur" },
    u2: { id: "u2", name: "Kepala TKQ", role: "kepala", unit: "TKQ" },
    u3: { id: "u3", name: "Ustadzah Aisyah (guru TKQ)", role: "pendidik", groupIds: ["TKA"] },
    u4: { id: "u4", name: "Ustadz Hamzah (murabbi RTQ)", role: "pendidik", groupIds: ["H1"] },
    u5: { id: "u5", name: "Kepala RTQ", role: "kepala", unit: "RTQ" },
    u6: { id: "u6", name: "Bapak Budi (wali)", role: "wali", childIds: ["s1", "s4"] },
  },
  groups: {
    TKA: { id: "TKA", name: "Kelas A", unit: "TKQ" },
    TKB: { id: "TKB", name: "Kelas B", unit: "TKQ" },
    H1: { id: "H1", name: "Halaqoh 1", unit: "RTQ" },
    H2: { id: "H2", name: "Halaqoh 2", unit: "RTQ" },
  },
  students: {
    s1: { id: "s1", name: "Naira", groupId: "TKA" },
    s2: { id: "s2", name: "Fadil", groupId: "TKA" },
    s3: { id: "s3", name: "Zahra", groupId: "TKB" },
    s4: { id: "s4", name: "Hanif", groupId: "H1" },
    s5: { id: "s5", name: "Rafi", groupId: "H1" },
    s6: { id: "s6", name: "Salman", groupId: "H2" },
  },
  // Bobot hanya contoh sampai formula resmi disahkan tim akademik.
  components: {
    TKQ: [
      { name: "Tahfidz", weight: 25 },
      { name: "Tahsin", weight: 25 },
      { name: "Calistung", weight: 25 },
      { name: "Adab & kemandirian", weight: 25 },
    ],
    RTQ: [
      { name: "Tahfidz", weight: 40 },
      { name: "Tahsin", weight: 30 },
      { name: "Murojaah", weight: 30 },
    ],
  },
  attendance: [],
    scores: {},
  reports: {},
    notes: [],
      // Contoh. Daftar resmi dan tingkat kerahasiaan menunggu keputusan pimpinan.
  incidentCategories: [
    { name: "Kesehatan ringan", level: "biasa" },
    { name: "Perselisihan antar anak", level: "biasa" },
    { name: "Perlindungan anak", level: "sensitif" },
  ],
  incidents: [],
    imports: [],
      recitations: [],
  audit: [],
});