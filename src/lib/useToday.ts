import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// Tanggal hari ini (YYYY-MM-DD) menurut Asia/Jakarta.
const today = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

// Kosong saat render di server, terisi di browser.
export function useToday() {
  return useSyncExternalStore(subscribe, today, () => "");
}