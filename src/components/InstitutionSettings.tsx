"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/useStoreHydrated";
import type { Academic, Institution } from "@/lib/types";

async function fileToLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Gunakan gambar PNG, JPG, atau WebP");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Gambar tidak bisa dibaca"));
      i.src = url;
    });
    const scale = Math.min(1, 256 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung pengolahan gambar");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function InstitutionSettings() {
  const hydrated = useStoreHydrated();
  const { data, saveInstitution, saveAcademic } = useStore();
  const [msg, setMsg] = useState("");
  if (!hydrated) return null;

  const ins = data.institution;
  const insKey = JSON.stringify([ins.name, ins.nomorStatistik, ins.address, ins.city, ins.mudir]);
  const acKey = JSON.stringify(data.academic);

  return (
    <section className="mb-4 space-y-4 rounded border bg-white p-4">
      <h2 className="font-semibold">Identitas lembaga (kop rapor)</h2>

      <InsForm
        key={insKey}
        onSave={(patch) => {
          const r = saveInstitution(patch);
          setMsg(r.ok ? "Identitas tersimpan." : r.error);
        }}
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {ins.logoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ins.logoDataUrl} alt="Logo lembaga" className="h-16 w-16 rounded border object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed text-xs text-slate-400">Logo</div>
        )}
        <label className="space-y-1">
          <span className="block font-medium">Logo lembaga (PNG, JPG, atau WebP)</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                const r = saveInstitution({ logoDataUrl: await fileToLogo(file) });
                setMsg(r.ok ? "Logo tersimpan." : r.error);
              } catch (err) {
                setMsg(err instanceof Error ? err.message : "Gagal membaca gambar");
              }
            }}
          />
        </label>
        {ins.logoDataUrl && (
          <button className="rounded border px-3 py-1.5 text-red-700" onClick={() => setMsg(saveInstitution({ logoDataUrl: "" }).ok ? "Logo dihapus." : "")}>
            Hapus logo
          </button>
        )}
      </div>

      <h2 className="pt-2 font-semibold">Tahun ajaran dan kuartal</h2>
      <AcademicForm
        key={acKey}
        onSave={(year, quarters) => {
          const r = saveAcademic(year, quarters);
          setMsg(r.ok ? "Tahun ajaran dan kuartal tersimpan." : r.error);
        }}
      />

      {msg && <p className="text-sm" role="status">{msg}</p>}
    </section>
  );
}

function InsForm({ onSave }: { onSave: (p: Partial<Institution>) => void }) {
  const ins = useStore((s) => s.data.institution);
  const [f, setF] = useState({
    name: ins.name, nomorStatistik: ins.nomorStatistik, address: ins.address, city: ins.city, mudir: ins.mudir,
  });
  const field = (k: keyof typeof f, label: string, wide = false) => (
    <label className={`text-sm ${wide ? "w-full" : "min-w-56 flex-1"}`}>
      <span className="mb-1 block text-slate-600">{label}</span>
      <input className="w-full rounded border p-2" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="flex flex-wrap gap-3">
      {field("name", "Nama lembaga", true)}
      {field("nomorStatistik", "Nomor statistik")}
      {field("city", "Kota (untuk tanggal tanda tangan)")}
      {field("address", "Alamat", true)}
      {field("mudir", "Nama mudir (tanda tangan)", true)}
      <button className="rounded bg-teal-700 px-3 py-2 text-sm text-white" onClick={() => onSave(f)}>Simpan identitas</button>
    </div>
  );
}

function AcademicForm({ onSave }: { onSave: (year: string, q: Academic["quarters"]) => void }) {
  const ac = useStore((s) => s.data.academic);
  const [year, setYear] = useState(ac.year);
  const [qs, setQs] = useState(ac.quarters.map((q) => ({ ...q })));
  const set = (i: number, k: "start" | "end" | "signDate", v: string) =>
    setQs(qs.map((q, j) => (j === i ? { ...q, [k]: v } : q)));
  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2">
        Tahun ajaran
        <input className="w-32 rounded border p-2" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026/2027" />
      </label>
      {qs.map((q, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <b className="w-20">Kuartal {i + 1}</b>
          <input type="date" className="rounded border p-1.5" value={q.start} onChange={(e) => set(i, "start", e.target.value)} aria-label={`Awal kuartal ${i + 1}`} />
          <span>s.d.</span>
          <input type="date" className="rounded border p-1.5" value={q.end} onChange={(e) => set(i, "end", e.target.value)} aria-label={`Akhir kuartal ${i + 1}`} />
          <span>tanda tangan</span>
          <input type="date" className="rounded border p-1.5" value={q.signDate} onChange={(e) => set(i, "signDate", e.target.value)} aria-label={`Tanggal tanda tangan kuartal ${i + 1}`} />
        </div>
      ))}
      <button className="rounded bg-teal-700 px-3 py-2 text-white" onClick={() => onSave(year, qs)}>Simpan kuartal</button>
      <p className="text-xs text-slate-500">
        Tanggal kuartal terkunci setelah ada rapor yang diajukan atau terbit di kuartal itu. Tanggal tanda tangan tetap bisa diubah.
      </p>
    </div>
  );
}