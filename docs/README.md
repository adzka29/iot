# SYNAPSE-T — Dokumentasi Sistem

Dokumentasi lengkap platform SYNAPSE-T (IoT Soldier Tracking & Command Platform).
Semua isi dokumen diturunkan langsung dari kode pada dua repositori:

| Komponen | Path lokal | Repo |
|---|---|---|
| Frontend (FE) | `C:\Users\najri\Downloads\iot_fe` | `github.com/adzka29/iot` · GitLab `tomang-infra/iot-fe/iot-tracking-fe` |
| Backend (BE) | `C:\Users\najri\Downloads\be-nest` | `github.com/adzka29/be-iot` · GitLab `tomang-infra/iot-fe/iot-tracking-be` |

## Daftar Dokumen

| No | Dokumen | Isi singkat |
|---|---|---|
| 01 | [Master Project Document](./01-master-project-document.md) | Ikhtisar proyek, ruang lingkup, stakeholder, tech stack, glosarium |
| 02 | [PRD](./02-prd.md) | Tujuan produk, persona, user story, functional & non-functional requirement |
| 03 | [TSD](./03-tsd.md) | Arsitektur, modul, aliran data, protokol paket telemetri, simulator, retensi |
| 04 | [API Contract](./04-api-contract.md) | Seluruh endpoint HTTP: path, parameter, response, error |
| 05 | [ERD & Database Specification](./05-erd-database-specification.md) | 21 tabel SQLite, kolom, relasi, enum, migrasi, seed, retensi |
| 06 | [UI/UX Specification](./06-ui-ux-specification.md) | Design token, navigasi, spesifikasi tiap layar, konvensi peta, responsive |
| 07 | [Security Specification](./07-security-specification.md) | Autentikasi, RBAC, audit, validasi, dan daftar temuan keamanan |
| 08 | [Test Plan & Test Report](./08-test-plan-and-report.md) | Strategi uji, 40 test case e2e, hasil eksekusi nyata, celah cakupan |
| 09 | [Deployment & Operations Guide](./09-deployment-operations-guide.md) | Environment, variabel, deploy Railway/Vercel, runbook, troubleshooting |

## Dokumentasi Khusus Frontend

Untuk katalog **menu + fungsi tombol** di UI saja (tanpa detail backend):

| Dokumen | Isi |
|---|---|
| [frontend/README.md](./frontend/README.md) | Indeks FE + peta menu cepat |
| [frontend/01-frontend-overview.md](./frontend/01-frontend-overview.md) | Stack, struktur, navigasi, sesi, proxy |
| [frontend/02-menu-functions.md](./frontend/02-menu-functions.md) | **Fungsi lengkap tiap menu** (Dashboard → Access) |

## Cara Membaca

- **Baru mengenal sistem** → mulai dari 01, lanjut 02, lalu 03.
- **Operator / pelajari menu UI** → [frontend/02-menu-functions.md](./frontend/02-menu-functions.md).
- **Mengerjakan integrasi API** → 04 (kontrak) dan 05 (bentuk data).
- **Mengerjakan UI** → [frontend/](./frontend/) + dokumen 06, dengan 04 sebagai referensi sumber data.
- **Audit keamanan / pre-production** → 07 dan 08.
- **Deploy atau menangani insiden** → 09.

## Status Dokumen

| Atribut | Nilai |
|---|---|
| Versi | 1.0 |
| Tanggal | 8 Oktober 2026 |
| Basis kode FE | commit `86b0734` |
| Basis kode BE | commit `eec3f95` |
| Sifat | Deskriptif — menggambarkan sistem **apa adanya**, bukan rencana ideal |

### Angka Kunci Sistem

| Metrik | Nilai |
|---|---|
| Endpoint HTTP | 104 pada 15 controller |
| Tabel basis data | 21 (SQLite) |
| Halaman frontend | 11 rute |
| Test backend | **40 lulus / 40 total** (dieksekusi 8 Okt 2026, 183 s) |
| Typecheck FE & BE | Keduanya bersih |
| Domain izin | 16 domain → 32 permission → 6 peran sistem |
| Endpoint tanpa autentikasi | **33** (2 memang publik, **31 tidak seharusnya**) |

### Dua Hal yang Perlu Diketahui Lebih Dulu

1. **Keamanan belum siap produksi.** Lima temuan P0 di dokumen 07, paling
   serius: token sesi dapat dipanen tanpa autentikasi lewat `GET /audit-logs`.
2. **Data yang tampil berasal dari simulator**, bukan perangkat nyata — 15
   prajurit simulasi, 1 paket/30 detik (dokumen 03 §6).

> Catatan penting: dokumen ini mencatat kondisi nyata kode, termasuk bagian yang belum
> selesai atau belum aman. Setiap celah ditandai eksplisit (lihat dokumen 07 dan 08)
> agar tidak terbaca sebagai klaim bahwa sistem sudah siap produksi.
