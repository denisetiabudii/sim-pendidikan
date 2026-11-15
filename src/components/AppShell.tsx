"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/useStoreHydrated";
import { useToday } from "@/lib/useToday";
import { canOpen, isActive, labelFor, navFor } from "@/lib/nav";
import StoreHydrator from "./StoreHydrator";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, currentUserId, session, signOut, resetGroups, reset, loadDemo } = useStore();
  const hydrated = useStoreHydrated();
  const today = useToday();

  const user = data.users[currentUserId] ?? Object.values(data.users)[0];
  const needsPick = !!session && user.role === "pendidik" && session.groupIds.length === 0;
  const authed = hydrated && !!session && !needsPick;
  const unit = session?.unit;

  useEffect(() => {
    if (hydrated && (!session || needsPick)) router.replace("/masuk");
  }, [hydrated, session, needsPick, router]);

  const items = navFor(user.role, unit);
  const theme =
    unit === "TKQ"
      ? { active: "bg-blue-600 text-white", badge: "bg-blue-600" }
      : unit === "RTQ"
        ? { active: "bg-violet-600 text-white", badge: "bg-violet-600" }
        : { active: "bg-teal-600 text-white", badge: "bg-teal-600" };
  const groups = (user.groupIds ?? [])
    .filter((g) => !session?.groupIds.length || session.groupIds.includes(g))
    .map((g) => data.groups[g]?.name)
    .filter(Boolean)
    .join(", ");

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
        isActive(pathname, href) ? theme.active : "text-slate-300 hover:bg-slate-800"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div hidden={!authed}>
      <StoreHydrator />
      <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
        <aside className="hidden w-60 shrink-0 flex-col bg-slate-900 p-3 text-slate-200 md:flex print:hidden">
          <div className="mb-4 px-2">
            <div className="font-bold text-white">SIM Pendidikan</div>
            <div className="text-xs text-slate-400">Amal Pendidikan</div>
            {unit && <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white ${theme.badge}`}>{unit}</span>}
          </div>
          <nav className="space-y-1">{items.map((n) => link(n.href, labelFor(n, unit)))}</nav>

          <div className="mt-auto space-y-2 border-t border-slate-700 pt-3 text-xs">
            <details className="text-slate-400">
              <summary className="cursor-pointer">Alat demo</summary>
              <div className="mt-2 space-y-1">
                <button
                  className="w-full rounded bg-slate-800 px-2 py-1.5 text-left text-slate-200"
                  onClick={() => {
                    if (today && confirm("Muat data demo? Data yang ada akan diganti.")) loadDemo(today);
                  }}
                >
                  Muat data demo
                </button>
                <button
                  className="w-full rounded bg-slate-800 px-2 py-1.5 text-left text-slate-200"
                  onClick={() => {
                    if (confirm("Kosongkan semua data dan keluar?")) reset();
                  }}
                >
                  Reset
                </button>
              </div>
            </details>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 print:hidden">
            Prototipe demo. Semua data fiktif dan hanya tersimpan di browser ini.
          </div>

          <header className="flex flex-wrap items-center gap-2 border-b bg-white px-4 py-2.5 print:hidden">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              {groups && <div className="truncate text-xs text-slate-500">{unit ? `${unit} · ` : ""}{groups}</div>}
            </div>
            {user.role === "pendidik" && (
              <button className="rounded border px-3 py-1.5 text-sm" onClick={resetGroups}>Ganti kelas</button>
            )}
            <button
              className="rounded border px-3 py-1.5 text-sm"
              onClick={() => {
                signOut();
              }}
            >
              Keluar
            </button>
          </header>

          <nav className="flex gap-1 overflow-x-auto bg-slate-900 px-2 py-2 md:hidden print:hidden">
            {items.map((n) => link(n.href, labelFor(n, unit)))}
          </nav>

          <main className="mx-auto max-w-4xl p-4">
            {!authed || canOpen(user.role, pathname, unit) ? (
              children
            ) : (
              <p className="rounded border bg-white p-4">Halaman ini tidak tersedia untuk akun Anda.</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}