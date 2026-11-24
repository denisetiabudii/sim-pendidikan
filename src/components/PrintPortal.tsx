"use client";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Menampilkan salinan isi di luar popup (tanpa gulir) supaya hasil cetak utuh per halaman.
export default function PrintPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add("printing");
    return () => document.documentElement.classList.remove("printing");
  }, []);
  return createPortal(<div className="print-root">{children}</div>, document.body);
}