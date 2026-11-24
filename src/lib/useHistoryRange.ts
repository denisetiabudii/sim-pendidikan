"use client";
import { useState, useSyncExternalStore } from "react";
import { DEFAULT_RANGE, MORE_STEP_DAYS, inRange, sinceMs } from "./historyRange";
import type { RangeId } from "./historyRange";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};
const snapshot = () => Math.floor(Date.now() / 60_000) * 60_000; // stabil dalam satu menit
// 0 saat render di server: belum ada penyaringan sampai halaman tampil di browser.
const useNowMs = () => useSyncExternalStore(subscribe, snapshot, () => 0);

// Rentang waktu untuk riwayat. Di backend, `since` menjadi parameter query, sehingga
// hanya data dalam rentang yang dimuat dari database.
export function useHistoryRange(initial: RangeId = DEFAULT_RANGE) {
  const [range, setRangeState] = useState<RangeId>(initial);
  const [extra, setExtra] = useState(0);
  const nowMs = useNowMs();
  const ready = nowMs > 0;
  const since = ready ? sinceMs(nowMs, range, extra) : 0;
  return {
    range,
    extra,
    since,
    ready,
    setRange: (r: RangeId) => {
      setRangeState(r);
      setExtra(0);
    },
    more: () => setExtra((e) => e + MORE_STEP_DAYS),
    keep: (iso: string) => !ready || inRange(iso, since),
  };
}
export type HistoryRange = ReturnType<typeof useHistoryRange>;
