"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/useStoreHydrated";
import { useToday } from "@/lib/useToday";
import { canOpen, isActive, navFor } from "@/lib/nav";
import StoreHydrator from "./StoreHydrator";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data, currentUserId, login, reset, loadDemo } = useStore();
  const hydrated = useStoreHydrated();
  const today = useToday();

  const user = data.users[currentUserId];
  const items = navFor(user.role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <StoreHydrator />

      <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 print:hidden">
        Prototipe demo. Semua data fiktif dan hanya tersimpan di browser ini.
      </div>

      <header className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-3 print:hidden">
        <strong className="min-w-44 flex-1">SIM-Pendidikan · Yuk Peduli</strong>
        <label className="text-sm text-slate-600">
          Lihat sebagai{" "}
          <select
            className="rounded border p-1.5"
            value={currentUserId}
            onChange={(e) => login(e.target.value)}
          >
            {Object.values(data.users).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
        <button
          className="rounded bg-teal-700 px-3 py-1.5 text-sm text-white"
          onClick={() => {
            if (today && confirm("Muat data demo? Data yang ada akan diganti.")) loadDemo(today);
          }}
        >
          Muat data demo
        </button>
        <button
          className="rounded border px-3 py-1.5 text-sm"
          onClick={() => {
            if (confirm("Kosongkan semua data?")) reset();
          }}
        >
          Reset
        </button>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b bg-white px-3 py-2 print:hidden">
        {items.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium ${
              isActive(pathname, n.href) ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>

      <main className="mx-auto max-w-4xl p-4">
        <div hidden={!hydrated}>
          {!hydrated || canOpen(user.role, pathname) ? (
            children
          ) : (
            <p className="rounded border bg-white p-4">Peran Anda tidak memiliki akses ke halaman ini.</p>
          )}
        </div>
      </main>
    </div>
  );
}