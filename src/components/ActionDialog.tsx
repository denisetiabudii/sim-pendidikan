"use client";
import { useState } from "react";
import Modal from "./Modal";

export type DialogKind = "submit" | "publish" | "revise";

const COPY: Record<DialogKind, { title: string; body: (n: string) => string; confirm: string }> = {
  submit: {
    title: "Ajukan rapor?",
    body: (n) => `Rapor ${n} akan dikirim ke PIC untuk disetujui. Selama menunggu, isinya tidak bisa diubah kecuali dikembalikan oleh PIC.`,
    confirm: "Ajukan",
  },
  publish: {
    title: "Publikasikan rapor?",
    body: (n) => `Rapor ${n} akan diterbitkan dan terkunci. Perubahan berikutnya hanya lewat versi revisi.`,
    confirm: "Publikasikan",
  },
  revise: {
    title: "Buat revisi rapor?",
    body: (n) => `Rapor ${n} yang sudah terbit akan dibuka kembali sebagai versi baru. Tulis alasan revisi:`,
    confirm: "Buat revisi",
  },
};

export default function ActionDialog({
  kind, name, onCancel, onConfirm,
}: { kind: DialogKind; name: string; onCancel: () => void; onConfirm: (reason?: string) => void }) {
  const [reason, setReason] = useState("");
  const c = COPY[kind];
  const needReason = kind === "revise";
  return (
    <Modal
      size="sm"
      title={c.title}
      onClose={onCancel}
      dirty={needReason && reason.trim().length > 0}
      saveLabel={c.confirm}
      saveDisabled={needReason && !reason.trim()}
      onSave={() => onConfirm(needReason ? reason.trim() : undefined)}
    >
      <p className="text-sm">{c.body(name)}</p>
      {needReason && (
        <textarea
          className="mt-3 w-full"
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label="Alasan revisi"
          autoFocus
        />
      )}
    </Modal>
  );
}