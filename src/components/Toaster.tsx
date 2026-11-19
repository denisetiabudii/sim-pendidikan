"use client";
import { CircleCheck, CircleX, Info, TriangleAlert, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToasts } from "@/lib/toast";
import type { ToastType } from "@/lib/toast";

const STYLE: Record<ToastType, { box: string; Icon: LucideIcon; title: string }> = {
  success: { box: "border-emerald-500 bg-emerald-50 text-emerald-900", Icon: CircleCheck, title: "Berhasil" },
  error: { box: "border-red-500 bg-red-50 text-red-900", Icon: CircleX, title: "Gagal" },
  warning: { box: "border-amber-500 bg-amber-50 text-amber-900", Icon: TriangleAlert, title: "Perhatian" },
  info: { box: "border-blue-500 bg-blue-50 text-blue-900", Icon: Info, title: "Info" },
};

export default function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:items-end print:hidden"
    >
      {toasts.map((t) => {
        const { box, Icon, title } = STYLE[t.type];
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={`toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 p-3 shadow-lg ring-1 ring-black/5 ${box}`}
          >
            <Icon size={20} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">
                {title}
                {t.count > 1 && <span className="ml-1.5 font-normal opacity-70">×{t.count}</span>}
              </div>
              <div className="break-words">{t.text}</div>
            </div>
            <button
              aria-label="Tutup pesan"
              className="rounded bg-transparent p-1 opacity-60 hover:opacity-100"
              onClick={() => dismiss(t.id)}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}