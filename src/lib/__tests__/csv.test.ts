import { describe, expect, it } from "vitest";
import { parseCsv, validateRows } from "../csv";
import { seed } from "../seed";

describe("parseCsv", () => {
  it("mengenali koma, titik koma, dan tab", () => {
    expect(parseCsv("nama,kelompok\nA,Kelas A")).toEqual([["nama", "kelompok"], ["A", "Kelas A"]]);
    expect(parseCsv("nama;kelompok\nRina;Kelas A")).toEqual([["nama", "kelompok"], ["Rina", "Kelas A"]]);
    expect(parseCsv("Sari\tKelas A")).toEqual([["Sari", "Kelas A"]]);
  });
  it("membaca tanda kutip dan membuang BOM", () => {
    expect(parseCsv('nama,kelompok\n"Ali, Jr",Kelas A')[1]).toEqual(["Ali, Jr", "Kelas A"]);
    expect(parseCsv("\uFEFFnama,kelompok\nA,B")[0][0]).toBe("nama");
  });
  it("mengabaikan baris kosong dan menerima CRLF", () => {
    expect(parseCsv("nama,kelompok\r\n\r\nA,Kelas A\r\n")).toHaveLength(2);
  });
});

describe("validateRows", () => {
  const data = seed();
  const kepalaTkq = data.users.u2;
  const direktur = data.users.u1;
  const err = (rows: string[][], user = kepalaTkq) => validateRows(data, user, rows).map((r) => r.error);

  it("baris valid tidak punya error", () => {
    expect(err([["nama", "kelompok"], ["Amina", "Kelas A"]])).toEqual([undefined]);
  });
  it("menolak kelompok di luar cakupan (lintas unit)", () => {
    expect(err([["Budi", "Halaqoh 1"]])[0]).toContain("tidak ditemukan");
    expect(err([["Hanif2", "Halaqoh 1"]], direktur)).toEqual([undefined]);
  });
  it("menandai duplikat di data yang ada dan di dalam berkas", () => {
    expect(err([["Naira", "Kelas A"]])[0]).toContain("Duplikat");
    expect(err([["Baru", "Kelas A"], ["baru", "Kelas A"]])).toEqual([undefined, expect.stringContaining("Duplikat")]);
  });
  it("menandai nama kosong dan kolom kelompok kosong", () => {
    expect(err([["", "Kelas A"]])[0]).toContain("Nama kosong");
    expect(err([["Sari"]])[0]).toContain("Kolom kelompok kosong");
  });
});