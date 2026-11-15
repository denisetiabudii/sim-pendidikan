"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Membaca data tersimpan dari localStorage setelah halaman tampil di browser.
export default function StoreHydrator() {
  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);
  return null;
}