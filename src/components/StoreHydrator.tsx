"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Membaca data tersimpan dari localStorage setelah halaman tampil.
// Kunjungan pertama (belum ada data tersimpan) langsung diisi data demo.
export default function StoreHydrator() {
  useEffect(() => {
    let firstVisit = false;
    try {
      firstVisit = !localStorage.getItem(useStore.persist.getOptions().name ?? "");
    } catch {
      /* penyimpanan tidak tersedia */
    }
    Promise.resolve(useStore.persist.rehydrate()).then(() => {
      if (firstVisit) {
        const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
        useStore.getState().loadDemo(today);
      }
    });
  }, []);
  return null;
}