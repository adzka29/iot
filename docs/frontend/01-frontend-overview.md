# 01 — Ikhtisar Frontend SYNAPSE-T

> Prasyarat: [README Frontend](./README.md)

---

## 1. Identitas Aplikasi

| Atribut | Nilai |
|---|---|
| Nama produk | SYNAPSE-T |
| Repo | `iot_fe` |
| Framework | Next.js **16.3.8** (App Router) |
| UI library | React **19.2.8** |
| Peta | Leaflet 1.9.4 + react-leaflet 5 |
| Grafik | recharts 3.10.1 |
| Styling | CSS kustom (~11.000 baris) + Tailwind v4 (hanya reset) |
| Bahasa UI | Inggris |
| Tema | Gelap permanen (`--bg #07101c`) |

---

## 2. Struktur Folder

```
iot_fe/src/
├── app/
│   ├── layout.tsx                 # Root: font Geist, metadata
│   ├── page.tsx                   # "/" → redirect "/login"
│   ├── globals.css
│   ├── login/                     # Masuk (di luar grup platform)
│   ├── (platform)/                # Grup rute — tidak muncul di URL
│   │   ├── dashboard/
│   │   ├── operations/
│   │   ├── alerts/
│   │   ├── explorer/
│   │   ├── history/
│   │   ├── reports/               # Mock
│   │   ├── profile/
│   │   ├── activity/
│   │   └── access/
│   ├── api/                       # 10 proxy ke backend NestJS
│   ├── tiles/[z]/[x]/[y]/         # Proxy tile OpenStreetMap
│   └── api/geocode/               # Nominatim (Jakarta)
├── components/
│   └── TopHeader.tsx              # Navigasi + menu pengguna
└── lib/                           # Klien API + helper UI
    ├── session.ts
    ├── profile.ts
    ├── explorer.ts
    ├── alerts.ts
    ├── history.ts
    ├── operations.ts
    ├── access.ts
    ├── access-proxy.ts
    └── audit-logs.ts
```

### Pola tiap halaman

```
src/app/(platform)/<fitur>/
├── page.tsx                 # Server Component — metadata + searchParams
├── components/
│   └── <fitur>-view.tsx     # Client Component — seluruh state UI
└── <fitur>.css              # CSS dengan prefix khusus
```

| Prefix CSS | Layar |
|---|---|
| `cmd-` | Header + Dashboard |
| `op-` | Operations |
| `al-` | Alerts |
| `ex-` | Explorer |
| `hs-` | History |
| `rp-` | Reports |
| `pf-` | Profile |
| `act-` | Activity |
| `ua-` | User Access |
| `auth-` | Login |

---

## 3. Navigasi

### 3.1 Bilah utama (`TopHeader`)

| Urutan | Label | Rute | Status |
|---|---|---|---|
| 1 | Dashboard | `/dashboard` | Aktif |
| 2 | Operations | `/operations` | Aktif |
| 3 | Alerts | `/alerts` | Aktif |
| 4 | Explorer | `/explorer` | Aktif |
| 5 | History | `/history` | Aktif |
| 6 | Reports | `/reports` | **Dinonaktifkan** — `Coming soon` |

Brand (logo + wordmark) selalu menaut ke `/dashboard`.

### 3.2 Menu pengguna (dropdown kanan)

| Label | Aksi |
|---|---|
| My Profile | → `/profile` |
| Activity Log | → `/activity` |
| User Access | → `/access` |
| Settings | **Hanya menutup menu** — belum ada halaman |
| Logout | Dialog konfirmasi → `logoutAccount()` → `/login` |

### 3.3 Deep link (URL parameter)

| Rute | Parameter | Efek |
|---|---|---|
| `/explorer` | `?id=`, `?q=` | Buka rekaman / isi pencarian |
| `/alerts` | `?id=`, `?soldier=`, `?type=` | Fokus alert / filter |
| `/history` | `?soldier=`, `?id=` | Muat track prajurit / lompat ke titik |

Parameter dibaca di **Server Component** (`searchParams`), bukan `useSearchParams`.

---

## 4. Autentikasi di Frontend

| Aspek | Perilaku |
|---|---|
| Penyimpanan | `localStorage.session_id` |
| Header | `Authorization: Bearer <token>` via `src/lib/session.ts` |
| Login | `POST /api/users/login` → simpan token → `/dashboard` |
| Logout | `POST /api/users/logout` → hapus token → `/login` |
| Guard rute | **Tidak ada** `middleware.ts` — tiap halaman mengecek sendiri |

Tanpa sesi: header menampilkan **"Guest" / "Signed out"**; beberapa halaman menampilkan pesan login required.

---

## 5. Proxy API (server-only)

Browser **tidak** memanggil backend langsung. Semua lewat route handler Next.js.

| Proxy FE | Diteruskan ke backend |
|---|---|
| `/api/explorer/**` | `/api/explorer/**` |
| `/api/alerts/**` | `/api/alerts/**` |
| `/api/history/**` | `/api/history/**` |
| `/api/operations/**` | `/api/operations/**` |
| `/api/users/**` | `/users/**` |
| `/api/auth/**` | `/auth/**`, `/users/me` |
| `/api/roles/**` | `/roles/**` |
| `/api/user-roles/**` | `/user-roles/**` |
| `/api/audit-logs/**` | `/audit-logs/**` |
| `/api/geocode` | Nominatim OSM |
| `/tiles/{z}/{x}/{y}` | `tile.openstreetmap.org` |

Alamat backend dari env server-only:

```
EXPLORER_API_BASE=https://be-iot-production.up.railway.app
```

Default lokal bila kosong: `http://127.0.0.1:8000`.

> Di Vercel, variabel ini **harus** di-set di dashboard (bukan hanya `.env.production`), lalu redeploy. Tanpa itu, data produksi kosong/salah.

---

## 6. Modul `src/lib` (ringkas)

| Berkas | Tanggung jawab |
|---|---|
| `session.ts` | Baca/tulis/hapus `session_id` |
| `profile.ts` | Login, logout, profil, foto |
| `explorer.ts` | Daftar TELEMETRY, pin peta, dekode, CSV |
| `alerts.ts` | Daftar alert, acknowledge, resolve, ticket |
| `history.ts` | Track, ringkasan, playback helpers, CSV |
| `operations.ts` | Operasi, geofence, konversi poligon, draft wizard |
| `access.ts` | Users, roles, bindings |
| `audit-logs.ts` | Activity log + aktivitas saya |
| `access-proxy.ts` | Factory proxy untuk roles / user-roles |

---

## 7. Konvensi Peta

| Aspek | Nilai |
|---|---|
| Pusat default | Jakarta `[-6.175421, 106.827312]` |
| Tile | `/tiles/{z}/{x}/{y}` + filter SVG malam |
| Import | `dynamic(..., { ssr: false })` — Leaflet butuh `window` |
| Koordinat Leaflet | `[lat, lng]` |
| Poligon dari BE | `[lng, lat]` → dikonversi di `lib/operations.ts` |

Komponen peta:

| File | Dipakai di |
|---|---|
| `ops-map.tsx` | Dashboard |
| `history-mini-map.tsx` | Dashboard (pratinjau track) |
| `explorer-mini-map.tsx` | Explorer / Alerts |
| `history-track-map.tsx` | History |
| `operations-map.tsx` | Operations + wizard |

---

## 8. Design Token Utama

Didefinisikan di `.cmd` (`dashboard.css`):

| Token | Nilai | Makna |
|---|---|---|
| `--bg` | `#07101c` | Latar |
| `--panel` | `#0d1726` | Kartu / panel |
| `--text` | `#e8f0fb` | Teks utama |
| `--muted` | `#8ea3bf` | Teks sekunder |
| `--cyan` | `#22d3ee` | Normal / aksen |
| `--green` | `#22c55e` | Sehat / selesai |
| `--amber` | `#f59e0b` | Peringatan |
| `--red` | `#ef4444` | Kritis / SOS |

Font: **Geist Sans** + **Geist Mono** (untuk hex, ID, koordinat).

---

## 9. Batasan Frontend yang Diketahui

| Item | Kondisi |
|---|---|
| Reports | Mock; menu dinonaktifkan |
| Layer Weapons di Dashboard | `Coming soon` |
| Settings di menu user | Tidak ada halaman |
| UI Tiket penuh | Hanya tombol Ticket di Alerts |
| Middleware auth | Tidak ada — rute tidak diproteksi otomatis |
| Uji otomatis FE | Belum ada (Vitest/Playwright) |

Rincian fungsi tiap menu → [02 — Fungsi Menu](./02-menu-functions.md).
