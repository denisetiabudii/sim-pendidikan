"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { canEditGroup, myStudentIds } from "@/lib/access";
import { groupIds, sortGroups } from "@/lib/groupBy";
import type { Note } from "@/lib/types";
import Modal from "@/components/Modal";
import GroupAccordion from "@/components/GroupAccordion";
import type { AccGroup } from "@/components/GroupAccordion";
import DayGroups from "@/components/DayGroups";
import RangeBar from "@/components/RangeBar";
import { useHistoryRange } from "@/lib/useHistoryRange";
import { Field, FormGroup } from "@/components/FormSection";

const fmt = (iso: string) => new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

function NoteForm({ students, initialId, onClose }: { students: { id: string; name: string }[]; initialId?: string; onClose: () => void }) {
  const { addNote } = useStore();
  const [sid, setSid] = useState(initialId ?? students[0]?.id ?? "");
  const [text, setText] = useState("");
  return (
    <Modal
      size="lg"
      title="Catatan baru"
      onClose={onClose}
      dirty={text.trim().length > 0}
      saveLabel="Kirim catatan"
      onSave={() => { if (addNote(sid, text).ok) onClose(); }}
    >
      <div className="space-y-3">
        <FormGroup step={1} title="Untuk siapa">
          <Field label="Peserta">
            <select className="w-full" value={sid} onChange={(e) => setSid(e.target.value)}>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </FormGroup>
        <FormGroup step={2} title="Isi catatan" hint="Kegiatan, kebiasaan, perkembangan, atau pesan untuk orang tua.">
          <Field label="Catatan" wide>
            <textarea className="w-full" rows={5} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </FormGroup>
      </div>
    </Modal>
  );
}

function NoteCard({ note }: { note: Note }) {
  const { data, markNoteRead, replyNote } = useStore();
  const user = useUser();
  const student = data.students[note.studentId];
  const [text, setText] = useState("");
  const canReply = user.role === "wali" || (user.role === "pendidik" && canEditGroup(data, user, student.groupId));

  return (
    <article className="card p-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">{data.users[note.authorId]?.name} · {fmt(note.at)}</span>
        <span className={`badge ml-auto ${note.readAt ? "badge-ok" : ""}`}>{note.readAt ? `Dibaca ${fmt(note.readAt)}` : "Belum dibaca"}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm">{note.text}</p>
      {user.role === "wali" && !note.readAt && (
        <button className="mt-2 rounded-lg border px-3 py-1 text-sm" onClick={() => markNoteRead(note.id)}>Tandai dibaca</button>
      )}
      {note.replies.length > 0 && (
        <ul className="mt-2 space-y-1 border-l-2 pl-3 text-sm">
          {note.replies.map((r) => (
            <li key={r.id}><span className="text-slate-500">{data.users[r.authorId]?.name} · {fmt(r.at)}:</span> {r.text}</li>
          ))}
        </ul>
      )}
      {canReply && (
        <div className="mt-2 flex gap-2">
          <input className="min-w-0 flex-1" placeholder="Tulis balasan" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => { if (replyNote(note.id, text).ok) setText(""); }}>Balas</button>
        </div>
      )}
    </article>
  );
}

function NoteHistory({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { data } = useStore();
  const user = useUser();
  const h = useHistoryRange();
  const s = data.students[studentId];
  const all = data.notes.filter((n) => n.studentId === studentId);
  const mustShow = (n: Note) => user.role === "wali" && !n.readAt; // catatan yang belum dibaca selalu tampil
  const items = all.filter((n) => mustShow(n) || h.keep(n.at));
  return (
    <Modal size="lg" title={`Catatan: ${s.name}`} subtitle={data.groups[s.groupId].name} cancelLabel="Tutup" onClose={onClose}>
      <div className="mb-3">
        <RangeBar h={h} shown={items.length} total={all.length} noun="catatan" note={user.role === "wali" ? "Yang belum dibaca selalu tampil." : undefined} />
      </div>
      {items.length === 0 && <p className="text-sm text-slate-500">Tidak ada catatan pada rentang ini.</p>}
      <DayGroups
        items={items}
        getIso={(n) => n.at}
        render={(n) => <NoteCard key={n.id} note={n} />}
      />
    </Modal>
  );
}

export default function BukuPenghubung() {
  const { data } = useStore();
  const user = useUser();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [hist, setHist] = useState<string | null>(null);

  const ids = myStudentIds(data, user);
  const isWali = user.role === "wali";
  const canWrite = user.role === "pendidik";
  const needle = q.trim().toLowerCase();
  const shown = ids.filter((id) => !needle || data.students[id].name.toLowerCase().includes(needle));
  const forceOpen = needle !== "";
  const all = groupIds(data, ids);
  const vis = groupIds(data, shown);
  const keys = sortGroups(data, forceOpen ? vis.keys() : all.keys());
  const notesOf = (id: string) => data.notes.filter((n) => n.studentId === id);
  const acc: AccGroup[] = keys.map((gid) => {
    const list = all.get(gid) ?? [];
    const notes = list.flatMap(notesOf);
    return {
      id: gid, title: data.groups[gid].name, total: list.length,
      chips: [
        { label: "catatan", n: notes.length },
        { label: "belum dibaca", n: isWali ? notes.filter((n) => !n.readAt).length : 0, cls: "badge-warn" },
      ],
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1">Komunikasi</h1>
        {canWrite && <button className="rounded-lg bg-accent px-4 py-2 text-sm text-white" onClick={() => setForm({})}>Catatan baru</button>}
      </div>

      <div className="card p-3">
        <input className="w-full" placeholder="Cari nama…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari nama" />
      </div>

      <GroupAccordion
        groups={acc}
        forceOpen={forceOpen}
        render={(gid) => (
          <ul className="divide-y">
            {(vis.get(gid) ?? []).map((id) => {
              const notes = notesOf(id);
              const latest = notes.reduce((a, n) => (n.at > a ? n.at : a), "");
              const unread = isWali ? notes.filter((n) => !n.readAt).length : 0;
              return (
                <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-40 flex-1">
                    <div className="font-medium">{data.students[id].name}</div>
                    <div className="text-xs text-slate-500">{latest ? `Terakhir ${fmt(latest)}` : "Belum ada catatan"}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {notes.length} catatan {unread > 0 && <span className="badge badge-warn ml-1">{unread} belum dibaca</span>}
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border px-3 py-1.5 text-sm" disabled={notes.length === 0} onClick={() => setHist(id)}>Riwayat</button>
                    {canWrite && <button className="rounded-lg bg-accent px-3 py-1.5 text-sm text-white" onClick={() => setForm({ id })}>Catatan baru</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      />
      {acc.length === 0 && <p className="card p-4 text-sm text-slate-500">Tidak ada nama yang cocok.</p>}

      {form && <NoteForm students={ids.map((id) => data.students[id])} initialId={form.id} onClose={() => setForm(null)} />}
      {hist && <NoteHistory studentId={hist} onClose={() => setHist(null)} />}
    </div>
  );
}