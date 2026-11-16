"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StoreHydrator from "@/components/StoreHydrator";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/useStoreHydrated";
import { DEMO_PASSWORD, eligible } from "@/lib/session";
import type { Entry } from "@/lib/session";

const ENTRIES: { id: Entry; title: string; sub: string; cls: string }[] = [
  {
    id: "TKQ",
    title: "TKQ",
    sub: "Taman Kanak Al-Qur'an",
    cls: "border-blue-500 bg-blue-50 text-blue-900",
  },
  {
    id: "RTQ",
    title: "RTQ",
    sub: "Rumah Tahfidz Al-Qur'an",
    cls: "border-violet-500 bg-violet-50 text-violet-900",
  },
  {
    id: "wali",
    title: "Orang tua",
    sub: "Pantau perkembangan anak",
    cls: "border-emerald-500 bg-emerald-50 text-emerald-900",
  },
  {
    id: "direktur",
    title: "Direktur",
    sub: "Ringkasan lintas unit",
    cls: "border-slate-500 bg-slate-50 text-slate-900",
  },
];

export default function Masuk() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const { data, currentUserId, session, signIn, chooseGroups } = useStore();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [picked, setPicked] = useState<string[] | null>(null);

  const user = session ? data.users[currentUserId] : undefined;
  const needsPick =
    !!user &&
    !!session &&
    user.role === "pendidik" &&
    session.groupIds.length === 0;
  const ready = !!user && !needsPick;

  useEffect(() => {
    if (hydrated && ready) router.replace("/");
  }, [hydrated, ready, router]);

  function submit(u: string, p: string) {
    if (!entry) return;
    const r = signIn(u, p, entry);
    setErr(r.ok ? "" : r.error);
    if (r.ok) {
      setPassword("");
      setPicked(null);
    }
  }

  const groups = user?.groupIds ?? [];
  const selected = picked ?? groups;
  const entryInfo = ENTRIES.find((e) => e.id === entry);
  const accounts = entry
    ? Object.values(data.users).filter((u) => eligible(data, u, entry))
    : [];

  return (
    <div hidden={!hydrated}>
      <StoreHydrator />
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-100 to-blue-100 p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-lg">
          <h1 className="text-xl font-bold">
            SIM Pendidikan · Amal Pendidikan
          </h1>
          <p className="mb-4 text-sm text-slate-600">
            Sistem Informasi Manajemen Pendidikan TKQ & RTQ
          </p>

          {needsPick && user ? (
            <section>
              <h2 className="mb-1 font-semibold">Pilih kelas atau halaqoh</h2>
              <p className="mb-3 text-sm text-slate-600">
                {user.name}. Pilih yang akan Anda kerjakan sekarang. Halaman
                hanya menampilkan pilihan ini.
              </p>
              <div className="space-y-2">
                {groups.map((g) => {
                  const on = selected.includes(g);
                  const count = Object.values(data.students).filter(
                    (s) => s.groupId === g,
                  ).length;
                  return (
                    <label
                      key={g}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${on ? "border-blue-500 bg-blue-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setPicked(
                            on
                              ? selected.filter((x) => x !== g)
                              : [...selected, g],
                          )
                        }
                      />
                      <span className="flex-1">
                        <b>
                          {data.groups[g].unit} · {data.groups[g].name}
                        </b>
                        <span className="block text-xs text-slate-500">
                          {count} peserta
                        </span>
                      </span>
                    </label>
                  );
                })}
                {groups.length === 0 && (
                  <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">
                    Akun ini belum memiliki penugasan. Minta kepala unit
                    menugaskan Anda di menu Penugasan.
                  </p>
                )}
              </div>
              {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
              <button
                className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white disabled:opacity-40"
                disabled={selected.length === 0}
                onClick={() => {
                  const r = chooseGroups(selected);
                  setErr(r.ok ? "" : r.error);
                }}
              >
                Lanjut ke dashboard →
              </button>
            </section>
          ) : !entry ? (
            <section>
              <h2 className="mb-2 font-semibold">Masuk sebagai</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ENTRIES.map((e) => (
                  <button
                    key={e.id}
                    className={`rounded-xl border-2 p-4 text-left ${e.cls}`}
                    onClick={() => setEntry(e.id)}
                  >
                    <div className="text-lg font-bold">{e.title}</div>
                    <div className="text-sm">{e.sub}</div>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <section>
              <button
                className="mb-2 text-sm text-slate-600 underline"
                onClick={() => {
                  setEntry(null);
                  setErr("");
                }}
              >
                ← Ganti pilihan
              </button>
              <h2 className="mb-3 font-semibold">
                Masuk · {entryInfo?.title} ({entryInfo?.sub})
              </h2>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(username, password);
                }}
              >
                <input
                  className="w-full rounded-lg border p-2.5"
                  placeholder="Username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border p-2.5"
                  type="password"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {err && <p className="text-sm text-red-700">{err}</p>}
                <button
                  className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white"
                  type="submit"
                >
                  Masuk
                </button>
              </form>

              <div className="mt-4 rounded-lg border border-dashed p-3 text-sm">
                <p className="mb-2 text-slate-600">
                  Mode demo: password semua akun adalah <b>{DEMO_PASSWORD}</b>.
                  Masuk cepat:
                </p>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((u) => (
                    <button
                      key={u.id}
                      className="rounded border px-2.5 py-1"
                      onClick={() => submit(u.username ?? "", DEMO_PASSWORD)}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
