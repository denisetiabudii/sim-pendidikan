# SIM-Pendidikan Yuk Peduli (prototipe frontend)

Prototipe Next.js dengan data fiktif yang tersimpan di browser (localStorage). Belum ada backend,
login, atau database. Pembatasan akses di sini hanya simulasi untuk peragaan alur.

## Menjalankan
npm install
npm run dev     # http://localhost:3000
npm test        # uji aturan akses, nilai, rapor, impor, setoran
npm run build   # pemeriksaan sebelum deploy

## Struktur
src/lib/        aturan bisnis murni: access, grades, reports, csv, quran, hafalan, dashboard, store
src/app/(app)/  halaman per modul
src/components/ AppShell dan StoreHydrator

## Catatan
- Bobot nilai, predikat, dan aturan hafalan masih contoh, menunggu pengesahan pimpinan.
- Aturan di src/lib harus diulang di server saat backend dibuat.