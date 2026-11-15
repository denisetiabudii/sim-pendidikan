import { useSyncExternalStore } from "react";
import { useStore } from "./store";

// true setelah data tersimpan selesai dibaca dari localStorage (hanya di browser).
export function useStoreHydrated() {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false
  );
}