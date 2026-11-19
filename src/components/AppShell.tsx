"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell, BookOpen, CalendarCheck, ClipboardList, FileText, GraduationCap, History, LayoutDashboard,
  LogOut, Menu, MessageSquare, Repeat, Settings, ShieldAlert, Upload, Users, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUser } from "@/lib/useUser";
import { useStoreHydrated } from "@/lib/useStoreHydrated";
import { useToday } from "@/lib/useToday";
import { myStudentIds } from "@/lib/access";
import { buildTasks } from "@/lib/dashboard";
import { currentQuarter } from "@/lib/rtq";
import { canOpen, isActive, labelFor, navFor } from "@/lib/nav";
import type { NavItem } from "@/lib/nav";
import type { Unit } from "@/lib/types";
import StoreHydrator from "./StoreHydrator";

const ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard, "/absensi": CalendarCheck, "/nilai": ClipboardList, "/setoran": BookOpen,
  "/buku-penghubung": MessageSquare, "/kejadian": ShieldAlert, "/rapor": FileText, "/rapor-kuartal": FileText,
  "/penugasan": Users, "/impor": Upload, "/pengaturan": Settings, "/audit": History,
};
const ADMIN = new Set(["/penugasan", "/impor", "/pengaturan", "/audit"]);

const initials = (name: string) =>
  name.replace(/\(.*?\)/g, "").trim().split(/\s+/)
    .filter((w) => !/^(ustadz|ustadzah|ibu|bapak)$/i.test(w))
    .slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "U";

function Brand({ logo, unit }: { logo?: string; unit?: Unit }) {
  return (
    <div className="flex items-center gap-3 px-4 py-5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="Logo lembaga" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
          <GraduationCap size={22} aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-bold text-white">SIM Pendidikan</div>
        <div className="text-xs text-slate-400">{unit ? `Unit ${unit}` : "Amal Pendidikan"}</div>
      </div>
    </div>
  );
}

function NavLink({ item, unit, active, onNavigate }: { item: NavItem; unit?: Unit; active: boolean; onNavigate?: () => void }) {
  const Icon = ICONS[item.href] ?? LayoutDashboard;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-accent text-white shadow-md" : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon size={18} aria-hidden />
      {labelFor(item, unit)}
    </Link>
  );
}

function SideNav({ items, unit, pathname, onNavigate }: { items: NavItem[]; unit?: Unit; pathname: string; onNavigate?: () => void }) {
  const groups = [
    { label: "Menu", list: items.filter((n) => !ADMIN.has(n.href)) },
    { label: "Administrasi", list: items.filter((n) => ADMIN.has(n.href)) },
  ].filter((g) => g.list.length > 0);
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3" aria-label="Menu utama">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</div>
          <div className="space-y-1">
            {g.list.map((n) => (
              <NavLink key={n.href} item={n} unit={unit} active={isActive(pathname, n.href)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function DemoTools({ today, loadDemo, reset }: { today: string; loadDemo: (d: string) => void; reset: () => void }) {
  return (
    <div className="border-t border-white/10 p-3 text-xs">
      <details className="text-slate-400">
        <summary className="cursor-pointer select-none">Alat demo</summary>
        <div className="mt-2 space-y-1">
          <button
            className="w-full rounded bg-white/10 px-2 py-1.5 text-left text-slate-200"
            onClick={() => {
              if (today && confirm("Muat data demo? Data yang ada akan diganti.")) loadDemo(today);
            }}
          >
            Muat data demo
          </button>
          <button
            className="w-full rounded bg-white/10 px-2 py-1.5 text-left text-slate-200"
            onClick={() => {
              if (confirm("Kosongkan semua data dan keluar?")) reset();
            }}
          >
            Reset
          </button>
        </div>
      </details>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data, currentUserId, session, signOut, resetGroups, reset, loadDemo } = useStore();
  const scoped = useUser();
  const hydrated = useStoreHydrated();
  const today = useToday();
  const [drawer, setDrawer] = useState(false);

  const user = data.users[currentUserId] ?? Object.values(data.users)[0];
  const needsPick = !!session && user.role === "pendidik" && session.groupIds.length === 0;
  const authed = hydrated && !!session && !needsPick;
  const unit = session?.unit;

  useEffect(() => {
    if (hydrated && (!session || needsPick)) router.replace("/masuk");
  }, [hydrated, session, needsPick, router]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const items = navFor(user.role, unit);
  const current = items.find((n) => isActive(pathname, n.href));
  const logo = data.institution.logoDataUrl;
  const taskCount = buildTasks(data, scoped, myStudentIds(data, scoped), today).length;
  const roleLabel = user.role === "direktur" ? "Direktur" : user.role === "kepala" ? `PIC ${unit ?? ""}` : unit === "RTQ" ? "Murabbi RTQ" : "Guru TKQ";
  const groups = (user.groupIds ?? [])
    .filter((g) => !session?.groupIds.length || session.groupIds.includes(g))
    .map((g) => data.groups[g]?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div hidden={!authed} data-unit={unit ?? ""} className="min-h-screen">
      <StoreHydrator />

      <aside className="bg-navy fixed inset-y-0 left-0 z-30 hidden w-64 flex-col md:flex print:hidden">
        <Brand logo={logo} unit={unit} />
        <SideNav items={items} unit={unit} pathname={pathname} />
        <DemoTools today={today} loadDemo={loadDemo} reset={reset} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <button aria-label="Tutup menu" className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawer(false)} />
          <div className="bg-navy relative flex h-full w-72 max-w-[85%] flex-col">
            <button className="absolute right-2 top-2 rounded bg-transparent p-2 text-slate-300" aria-label="Tutup" onClick={() => setDrawer(false)}>
              <X size={20} />
            </button>
            <Brand logo={logo} unit={unit} />
            <SideNav items={items} unit={unit} pathname={pathname} onNavigate={() => setDrawer(false)} />
            <DemoTools today={today} loadDemo={loadDemo} reset={reset} />
          </div>
        </div>
      )}

      <div className="md:pl-64 print:pl-0">
        <div className="bg-amber-100 px-4 py-1 text-center text-xs text-amber-900 print:hidden">
          Prototipe demo. Semua data fiktif dan hanya tersimpan di browser ini.
        </div>

        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white/90 px-4 py-2.5 backdrop-blur print:hidden">
          <button className="rounded-lg border p-2 md:hidden" aria-label="Buka menu" onClick={() => setDrawer(true)}>
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{current ? labelFor(current, unit) : ""}</div>
            <div className="truncate text-xs text-slate-500">{groups ? `${unit} · ${groups}` : roleLabel}</div>
          </div>

          {today && (
            <span className="badge badge-accent hidden lg:inline-flex">
              TA {data.academic.year} · Kuartal {currentQuarter(data.academic, today)}
            </span>
          )}
          {user.role === "pendidik" && (
            <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm" onClick={resetGroups}>
              <Repeat size={16} aria-hidden />
              <span className="hidden sm:inline">Ganti kelas</span>
            </button>
          )}
          <Link
            href="/"
            aria-label={`Tugas yang perlu dikerjakan: ${taskCount}`}
            className="relative rounded-full border bg-white p-2 text-slate-600 hover:bg-slate-50"
          >
            <Bell size={18} aria-hidden />
            {taskCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
                {taskCount}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-ink sm:flex" aria-hidden>
              {initials(user.name)}
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm" onClick={signOut}>
              <LogOut size={16} aria-hidden />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl p-4 md:p-6">
          <div key={pathname} className="page-enter">
            {!authed || canOpen(user.role, pathname, unit) ? children : <p className="card p-4">Halaman ini tidak tersedia untuk akun Anda.</p>}
          </div>
        </main>
      </div>
    </div>
  );
}