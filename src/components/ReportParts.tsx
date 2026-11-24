import type { ReactNode } from "react";
import type { Institution } from "@/lib/types";

// Bagian-bagian kecil yang dipakai bersama oleh lembar rapor TKQ dan RTQ.
// Didefinisikan di luar komponen lembar agar tidak dibuat ulang setiap render.

export function Kop({ ins, npsn = false }: { ins: Institution; npsn?: boolean }) {
  return (
    <div className="rp-kop">
      {ins.logoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ins.logoDataUrl} alt="Logo lembaga" className="rp-logo" />
      ) : (
        <div className="rp-logo-ph">Logo</div>
      )}
      <div className="rp-kop-t">
        <div className="rp-kop-n">{ins.name}</div>
        <div className="rp-kop-s">{ins.address}</div>
        <div className="rp-kop-s">
          {npsn ? `NPSN: ${ins.nomorStatistik || "-"}` : `Nomor Statistik LPQ. ${ins.nomorStatistik}`}
          {ins.email ? ` · ${ins.email}` : ""}
        </div>
      </div>
    </div>
  );
}

export function Pair({ k, v, wide }: { k: string; v?: string; wide?: boolean }) {
  return (
    <div className={`rp-pair${wide ? " wide" : ""}`}>
      <span className="rp-k">{k}</span>
      <span>:</span>
      <span className="rp-v">{v || "……………………"}</span>
    </div>
  );
}

export function Pairs({ children }: { children: ReactNode }) {
  return <div className="rp-pairs">{children}</div>;
}

export function Narr({ title, text }: { title: string; text: string }) {
  return (
    <div className="rp-narr">
      <h3>{title}</h3>
      <p>{text || "–"}</p>
    </div>
  );
}

export function Sign({
  ins, teacher, date, role,
}: { ins: Institution; teacher?: string; date: string; role: string }) {
  return (
    <div className="rp-sign">
      <div>
        Mengetahui
        <br />
        Kepala {ins.name}
        <div className="rp-gap" />
        <u>{ins.mudir}</u>
      </div>
      <div className="r">
        {ins.city}, {date}
        <br />
        {role}
        <div className="rp-gap" />
        <u>{teacher ?? "………………"}</u>
      </div>
    </div>
  );
}
