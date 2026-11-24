"use client";
import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

const SIZE = {
  sm: "max-w-md self-center rounded-2xl mx-4 max-h-[90vh]",
  lg: "max-w-3xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:self-center",
  xl: "max-w-5xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:self-center",
};

interface Props {
  title: string;
  subtitle?: string;
  onClose: () => void;
  dirty?: boolean; // ada isian yang belum disimpan: X dan Batal meminta konfirmasi
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  cancelLabel?: string;
  footerNote?: ReactNode;
  extra?: ReactNode; // tombol tambahan di footer, mis. Cetak
  size?: keyof typeof SIZE;
  children: ReactNode;
}

// Popup yang menimpa halaman. Hanya bisa ditutup lewat X, Batal/Tutup, atau Simpan.
// Klik di luar dan tombol Esc sengaja tidak menutup, supaya isian tidak hilang tanpa sengaja.
export default function Modal({
  title, subtitle, onClose, dirty = false, onSave, saveLabel = "Simpan", saveDisabled,
  cancelLabel = "Batal", footerNote, extra, size = "xl", children,
}: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const unit = useStore((s) => s.session?.unit);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const lock = document.body.style.overflow;
    document.documentElement.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.style.overflow = lock;
      prev?.focus?.();
    };
  }, []);

  const requestClose = () => {
    if (dirty && !confirm("Buang perubahan yang belum disimpan?")) return;
    onClose();
  };

  // Fokus tetap berputar di dalam popup.
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Tab" || !panel.current) return;
    const els = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (els.length === 0) return e.preventDefault();
    const first = els[0];
    const last = els[els.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      data-unit={unit ?? ""}
      onKeyDown={onKeyDown}
      className="modal-root fixed inset-0 z-50 flex items-stretch justify-center bg-slate-900/60 sm:p-4"
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-panel page-enter flex w-full flex-col overflow-hidden bg-white shadow-2xl outline-none ${SIZE[size]}`}
      >
        <header className="flex items-start gap-3 border-b px-5 py-3 print:hidden">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button aria-label="Tutup" className="rounded-lg border p-2" onClick={requestClose}>
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="modal-body min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">{children}</div>

        <footer className="flex flex-wrap items-center gap-2 border-t bg-white px-5 py-3 print:hidden">
          <div className="min-w-0 flex-1 text-sm">{footerNote}</div>
          {extra}
          <button className="rounded-lg border px-4 py-2 text-sm" onClick={requestClose}>{cancelLabel}</button>
          {onSave && (
            <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" disabled={saveDisabled} onClick={onSave}>
              {saveLabel}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}