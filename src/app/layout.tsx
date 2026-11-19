import type { Metadata, Viewport } from "next";
import "./globals.css";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: "SIM Pendidikan Yuk Peduli",
  description: "Sistem Informasi Manajemen Pendidikan TKQ dan RTQ",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}