"use client";
import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";
export interface Toast { id: number; type: ToastType; text: string; count: number }

interface S {
  toasts: Toast[];
  notify: (type: ToastType, text: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useToasts = create<S>()((set, get) => ({
  toasts: [],
  notify: (type, text) => {
    const same = get().toasts.find((t) => t.type === type && t.text === text);
    const id = same ? same.id : ++seq;
    if (same) set({ toasts: get().toasts.map((t) => (t.id === id ? { ...t, count: t.count + 1 } : t)) });
    else set({ toasts: [...get().toasts.slice(-3), { id, type, text, count: 1 }] });
    if (typeof window === "undefined") return;
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => get().dismiss(id), type === "error" || type === "warning" ? 7000 : 4000));
  },
  dismiss: (id) => {
    clearTimeout(timers.get(id));
    timers.delete(id);
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const notify = (type: ToastType, text: string) => useToasts.getState().notify(type, text);
export const warn = (text: string) => notify("warning", text);