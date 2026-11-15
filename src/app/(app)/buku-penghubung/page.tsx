"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { canEditGroup, canSeeStudent, myStudentIds } from "@/lib/access";
import type { Note } from "@/lib/types";
import { useUser } from "@/lib/useUser";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

export default function BukuPenghubung() {
  const { data, addNote } = useStore();
  const user = useUser();
  const [sid, setSid] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  const students = myStudentIds(data, user).map((id) => data.students[id]);
  const studentId = students.some((s) => s.id === sid) ? sid : students[0]?.id;
  const notes = data.notes.filter((n) =>
    canSeeStudent(data, user, n.studentId),
  );

  function send() {
    if (!studentId) return;
    const r = addNote(studentId, text);
    setMsg(r.ok ? "" : r.error);
    if (r.ok) setText("");
  }

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Buku penghubung</h1>

      {user.role === "pendidik" && (
        <section className="mb-4 rounded border bg-white p-3">
          <h2 className="mb-2 font-semibold">Catatan baru</h2>
          <select
            className="mb-2 rounded border bg-white p-2 text-sm"
            value={studentId ?? ""}
            onChange={(e) => setSid(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={3}
            maxLength={1000}
            placeholder="Kegiatan, kebiasaan, perkembangan, atau pesan untuk orang tua"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="mt-2 rounded bg-teal-700 px-3 py-2 text-sm text-white"
            onClick={send}
          >
            Kirim catatan
          </button>
          {msg && <p className="mt-2 text-sm text-red-700">{msg}</p>}
        </section>
      )}

      <div className="space-y-3">
        {notes.map((n) => (
          <NoteCard key={n.id} note={n} />
        ))}
        {notes.length === 0 && (
          <p className="rounded border bg-white p-3 text-sm text-slate-500">
            {user.role === "pendidik"
              ? "Belum ada catatan. Kirim catatan pertama dari formulir di atas."
              : "Belum ada catatan dalam cakupan Anda."}
          </p>
        )}
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const { data, currentUserId, markNoteRead, replyNote } = useStore();
  const user = data.users[currentUserId];
  const student = data.students[note.studentId];
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  const canReply =
    user.role === "wali" ||
    (user.role === "pendidik" && canEditGroup(data, user, student.groupId));

  function reply() {
    const r = replyNote(note.id, text);
    setErr(r.ok ? "" : r.error);
    if (r.ok) setText("");
  }

  return (
    <article className="rounded border bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <b>{student.name}</b>
        <span className="text-slate-500">
          {data.users[note.authorId]?.name} · {fmt(note.at)}
        </span>
        <span className="ml-auto text-xs text-slate-500">
          {note.readAt ? `Dibaca ${fmt(note.readAt)}` : "Belum dibaca"}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{note.text}</p>

      {user.role === "wali" && !note.readAt && (
        <button
          className="mt-2 rounded border px-2.5 py-1 text-sm"
          onClick={() => markNoteRead(note.id)}
        >
          Tandai dibaca
        </button>
      )}

      {note.replies.length > 0 && (
        <ul className="mt-2 space-y-1 border-l-2 pl-3 text-sm">
          {note.replies.map((r) => (
            <li key={r.id}>
              <span className="text-slate-500">
                {data.users[r.authorId]?.name} · {fmt(r.at)}:
              </span>{" "}
              {r.text}
            </li>
          ))}
        </ul>
      )}

      {canReply && (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded border p-1.5 text-sm"
            placeholder="Tulis balasan"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="rounded border px-3 py-1.5 text-sm"
            onClick={reply}
          >
            Balas
          </button>
        </div>
      )}
      {err && <p className="mt-1 text-sm text-red-700">{err}</p>}
    </article>
  );
}
