import { beforeEach, describe, expect, it } from "vitest";
import { notify, useToasts } from "../toast";
import { useStore } from "../store";
import { seed } from "../seed";

const toasts = () => useToasts.getState().toasts;
beforeEach(() => {
  useToasts.setState({ toasts: [] });
  useStore.setState({ data: seed(), currentUserId: "u3", session: null });
});

describe("toast", () => {
  it("pesan yang sama digabung dan dihitung", () => {
    notify("success", "A");
    notify("success", "A");
    expect(toasts()).toEqual([expect.objectContaining({ type: "success", text: "A", count: 2 })]);
  });
  it("menyimpan paling banyak empat pesan terbaru", () => {
    for (let i = 0; i < 6; i++) notify("info", `t${i}`);
    expect(toasts().map((t) => t.text)).toEqual(["t2", "t3", "t4", "t5"]);
  });
});

describe("umpan balik otomatis dari aksi store", () => {
  it("sukses menampilkan pesan hijau, gagal menampilkan pesan merah", () => {
    useStore.getState().recordAttendance("s1", "2026-11-15", "Hadir");
    expect(toasts()[toasts().length - 1]).toMatchObject({ type: "success", text: "Absensi tersimpan" });
    useStore.getState().recordAttendance("s3", "2026-11-15", "Hadir");
    expect(toasts()[toasts().length - 1]).toMatchObject({ type: "error", text: expect.stringContaining("Ditolak") });
  });
  it("login gagal menampilkan pesan, login berhasil tanpa pesan", () => {
    useStore.getState().signIn("aisyah", "salah", "TKQ:guru");
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].type).toBe("error");
    useToasts.setState({ toasts: [] });
    useStore.getState().signIn("aisyah", "demo", "TKQ:guru");
    expect(toasts()).toHaveLength(0);
  });
  it("tumpang tindih setoran tidak menampilkan pesan galat (halaman yang meminta konfirmasi)", () => {
    useStore.getState().login("u4");
    const rec = { studentId: "s4", date: "2026-11-15", kind: "Setoran baru" as const, surahNo: 112, from: 1, to: 4, quality: "Lancar" as const };
    expect(useStore.getState().addRecitation(rec).ok).toBe(true);
    expect(useStore.getState().addRecitation(rec)).toMatchObject({ ok: false, code: "overlap" });
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toMatchObject({ type: "success", count: 1 });
  });
});