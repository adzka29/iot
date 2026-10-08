# Dokumentasi Frontend SYNAPSE-T

> Khusus frontend (`iot_fe`) · Versi 1.0 · 8 Oktober 2026  
> Repo: `C:\Users\najri\Downloads\iot_fe` · Next.js 16.3.8 · React 19.2.8

Dokumentasi ini menjelaskan **semua menu di frontend**, fungsi tiap layar, kontrol UI,
sumber data, dan batasan yang diketahui — tanpa mencampur detail backend.

| Dokumen | Isi |
|---|---|
| [01 — Ikhtisar Frontend](./01-frontend-overview.md) | Stack, struktur folder, navigasi, sesi, proxy API |
| [02 — Fungsi Menu](./02-menu-functions.md) | **Semua menu + fungsi tombol/filter/aksi** per layar |

Dokumen sistem lengkap (FE + BE) tetap di folder induk: [`../README.md`](../README.md).

---

## Peta Menu Cepat

```
┌─────────────────────────────────────────────────────────────────┐
│  SYNAPSE-T                                    [Avatar · Nama] ▼ │
│  Dashboard · Operations · Alerts · Explorer · History · Reports │
└─────────────────────────────────────────────────────────────────┘
         │                                              │
         │                                              ├─ My Profile
         │                                              ├─ Activity Log
         │                                              ├─ User Access
         │                                              ├─ Settings (kosong)
         │                                              └─ Logout
         │
         ├─ /dashboard   Peta komando real-time
         ├─ /operations  Operasi + wizard buat operasi
         ├─ /alerts      Triase alert
         ├─ /explorer    Cari rekaman telemetri
         ├─ /history     Track historis + playback
         └─ /reports     Mock — Coming soon (dinonaktifkan)
```

| Menu | Rute | Status | Fungsi utama |
|---|---|---|---|
| **Dashboard** | `/dashboard` | Aktif | Peta personel, dossier, Recent Matches |
| **Operations** | `/operations` | Aktif | Daftar operasi, detail, wizard 4 langkah |
| **Alerts** | `/alerts` | Aktif | Filter, acknowledge, resolve, ticket |
| **Explorer** | `/explorer` | Aktif | Cari TELEMETRY, detail paket, ekspor CSV |
| **History** | `/history` | Aktif | Track peta, playback, statistik |
| **Reports** | `/reports` | **Coming soon** | Mock statis, tanpa API |
| **My Profile** | `/profile` | Aktif (menu user) | Edit nama/email/foto |
| **Activity Log** | `/activity` | Aktif (menu user) | Audit seluruh sistem |
| **User Access** | `/access` | Aktif (menu user) | Identitas, peran, binding |
| **Login** | `/login` | Aktif | Masuk akun |

---

## Cara Baca

- **Operator / pengguna baru** → mulai dari [02 — Fungsi Menu](./02-menu-functions.md).
- **Pengembang FE** → [01 — Ikhtisar](./01-frontend-overview.md) lalu 02.
- **Integrasi API** → lihat juga [`../04-api-contract.md`](../04-api-contract.md).
