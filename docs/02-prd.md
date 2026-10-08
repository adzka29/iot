# 02 — Product Requirements Document (PRD)

> SYNAPSE-T · Versi 1.0 · 8 Oktober 2026
> Prasyarat: [01 — Master Project Document](./01-master-project-document.md)

Dokumen ini menguraikan **apa** yang harus dilakukan sistem, dari sudut pandang pengguna.
Setiap requirement diberi ID (`FR-*` / `NFR-*`) dan mencantumkan status implementasi
nyata di kode. Penjelasan **bagaimana** ada di [03 — TSD](./03-tsd.md).

Legenda status: ✅ Terimplementasi · ⚠️ Sebagian · ❌ Belum ada

---

## 1. Visi Produk

> Memberi komandan satu layar yang menjawab tiga pertanyaan dalam hitungan detik:
> **Di mana personel saya? Siapa yang bermasalah? Apa yang harus dilakukan sekarang?**

Prinsip produk:

| Prinsip | Konsekuensi desain |
|---|---|
| **Kondisi kritis tidak boleh perlu dicari** | Alert kritis muncul di dashboard tanpa filter apa pun |
| **Jangan pernah mengarang data** | Jika master personel belum ada, `group` tetap `null` — bukan nama tebakan |
| **Byte mentah adalah bukti** | `raw_hex` disimpan selamanya selama rekaman hidup |
| **Setiap aksi punya pemilik** | Acknowledge, resolve, aktivasi operasi mencatat aktor |
| **Peta adalah antarmuka utama** | 5 dari 9 halaman memiliki peta |

---

## 2. Persona Pengguna

### P-1 · Komandan Operasi — "Mayor Adi"

| Atribut | Keterangan |
|---|---|
| Tujuan | Keputusan cepat; tahu kondisi satuan tanpa membaca tabel |
| Frekuensi | Beberapa kali sehari, sesi pendek |
| Peran sistem | `operations commander` |
| Jalur utama | `/dashboard` → klik marker kritis → `/alerts` |
| Kebutuhan kunci | Peta penuh, SOS menonjol, jumlah alert terbuka, status operasi |

### P-2 · Operator Pusat Kendali — "Sersan Rina"

| Atribut | Keterangan |
|---|---|
| Tujuan | Monitoring berkelanjutan, triase, tindak lanjut |
| Frekuensi | Sepanjang shift |
| Peran sistem | `operations officer` |
| Jalur utama | `/alerts` → acknowledge → buat tiket → `/history` untuk verifikasi |
| Kebutuhan kunci | Filter cepat, ekspor CSV, riwayat per prajurit |

### P-3 · Perencana Operasi — "Letnan Bagas"

| Atribut | Keterangan |
|---|---|
| Tujuan | Menyusun operasi: grup, personel, zona |
| Frekuensi | Saat perencanaan |
| Peran sistem | `operations officer` |
| Jalur utama | `/operations` → wizard 4 langkah → aktivasi |
| Kebutuhan kunci | Menggambar geofence di peta, membentuk grup dari seleksi personel |

### P-4 · Administrator Sistem — "Admin IT"

| Atribut | Keterangan |
|---|---|
| Tujuan | Kelola identitas, peran, dan audit |
| Frekuensi | Mingguan |
| Peran sistem | `superadmin` |
| Jalur utama | `/access` → buat identitas → ikat peran; `/activity` untuk audit |
| Kebutuhan kunci | Daftar pengguna, katalog peran, log aktivitas yang bisa difilter |

### P-5 · Gateway / Terminal Satelit (aktor non-manusia)

| Atribut | Keterangan |
|---|---|
| Tujuan | Menyetor burst telemetri |
| Antarmuka | `POST /api/ingest` dengan hex burst |
| Kebutuhan kunci | Respons cepat, idempoten terhadap paket duplikat, tanpa sesi |

---

## 3. Epic dan User Story

### E-1 · Situational Awareness (Dashboard)

| ID | User Story | Status |
|---|---|---|
| US-1.1 | Sebagai komandan, saya ingin melihat seluruh personel di satu peta agar tahu sebaran satuan | ✅ |
| US-1.2 | Sebagai komandan, saya ingin marker berwarna sesuai kondisi agar masalah langsung terlihat | ✅ |
| US-1.3 | Sebagai komandan, saya ingin melihat kartu prajurit berisi vitals agar tidak perlu membuka halaman lain | ✅ |
| US-1.4 | Sebagai komandan, saya ingin melihat geofence operasi aktif di peta | ✅ |
| US-1.5 | Sebagai komandan, saya ingin melihat posisi senjata di peta | ❌ Marker hardcoded, menu dinonaktifkan |
| US-1.6 | Sebagai operator, saya ingin mengklik marker lalu melompat ke riwayat prajurit tersebut | ✅ Lewat deep link `?soldier=` |

### E-2 · Pendalaman Data (Explorer)

| ID | User Story | Status |
|---|---|---|
| US-2.1 | Sebagai operator, saya ingin mencari rekaman berdasarkan prajurit, grup, kategori, dan rentang waktu | ✅ |
| US-2.2 | Sebagai operator, saya ingin melihat byte mentah satu paket agar bisa memverifikasi dekode | ✅ |
| US-2.3 | Sebagai operator, saya ingin melihat distribusi rekaman pada timeline | ✅ |
| US-2.4 | Sebagai operator, saya ingin mengekspor hasil pencarian ke CSV | ✅ |
| US-2.5 | Sebagai operator, saya ingin membuka rekaman tertentu dari tautan | ✅ `?record=` |

### E-3 · Manajemen Alert

| ID | User Story | Status |
|---|---|---|
| US-3.1 | Sebagai sistem, saya membuka alert otomatis saat flag kondisi menyala | ✅ |
| US-3.2 | Sebagai sistem, saya menutup alert otomatis saat kondisinya hilang | ✅ Status `CLEARED` |
| US-3.3 | Sebagai operator, saya ingin acknowledge alert agar rekan tahu sudah ditangani | ✅ |
| US-3.4 | Sebagai operator, saya ingin resolve alert dengan catatan | ✅ |
| US-3.5 | Sebagai operator, saya ingin alert yang sama tidak membanjiri daftar | ✅ Satu baris terbuka per `(soldier_id, alert_type)` |
| US-3.6 | Sebagai operator, saya ingin melihat lokasi alert di peta | ✅ |
| US-3.7 | Sebagai operator, saya ingin membuat tiket dari sebuah alert | ⚠️ API lengkap, UI hanya tombol |

### E-4 · Analisis Historis

| ID | User Story | Status |
|---|---|---|
| US-4.1 | Sebagai operator, saya ingin melihat jalur pergerakan satu prajurit pada peta | ✅ |
| US-4.2 | Sebagai operator, saya ingin memutar ulang pergerakan seperti video | ✅ Playback dengan kecepatan 1×–8× |
| US-4.3 | Sebagai operator, saya ingin melihat grafik denyut jantung, SpO₂, dan suhu | ✅ |
| US-4.4 | Sebagai operator, saya ingin melihat statistik ringkas (jarak, durasi, kecepatan) | ✅ |
| US-4.5 | Sebagai operator, saya ingin menelusuri satu grup, bukan hanya satu prajurit | ✅ `scope=GROUP` |

### E-5 · Operasi Taktis

| ID | User Story | Status |
|---|---|---|
| US-5.1 | Sebagai perencana, saya ingin membuat operasi lewat wizard terpandu | ✅ 4 langkah |
| US-5.2 | Sebagai perencana, saya ingin memilih personel dari peta yang sama dengan dashboard | ✅ Diperbaiki — menggabungkan explorer + master personel |
| US-5.3 | Sebagai perencana, saya ingin membentuk grup baru dari personel yang saya pilih | ✅ |
| US-5.4 | Sebagai perencana, saya ingin menunjuk pemimpin (DANRU) setiap grup | ✅ |
| US-5.5 | Sebagai perencana, saya ingin menggambar geofence poligon dan lingkaran di peta | ✅ |
| US-5.6 | Sebagai perencana, saya ingin menandai jenis zona: restricted / safe / recon | ✅ |
| US-5.7 | Sebagai perencana, zona yang saya gambar tidak boleh hilang saat pindah langkah | ✅ Diperbaiki — draw di-flush sebelum navigasi |
| US-5.8 | Sebagai komandan, saya ingin menjalankan siklus hidup operasi: activate, hold, resume, complete, cancel | ✅ |
| US-5.9 | Sebagai komandan, saya ingin melihat alert dan tiket milik satu operasi | ✅ |
| US-5.10 | Sebagai perencana, saya ingin menautkan grup yang sudah ada ke operasi | ⚠️ API ada; kartu UI dihapus atas permintaan pengguna |

### E-6 · Kontrol Akses

| ID | User Story | Status |
|---|---|---|
| US-6.1 | Sebagai admin, saya ingin membuat identitas manusia maupun service | ✅ |
| US-6.2 | Sebagai admin, saya ingin melihat katalog peran dan izinnya | ✅ |
| US-6.3 | Sebagai admin, saya ingin mengikat pengguna ke satu peran | ✅ |
| US-6.4 | Sebagai admin, saya ingin menangguhkan atau mencabut akses | ✅ Status `SUSPENDED` / `REVOKED` |
| US-6.5 | Sebagai admin, saya ingin menyusun izin peran kustom dari UI | ❌ Fungsi service ada, tanpa endpoint |
| US-6.6 | Sebagai pengguna, saya ingin masuk dengan username dan password | ✅ |
| US-6.7 | Sebagai pengguna, saya ingin mengubah nama, email, dan foto profil | ✅ |

### E-7 · Audit

| ID | User Story | Status |
|---|---|---|
| US-7.1 | Sebagai admin, saya ingin melihat seluruh aktivitas pengguna | ✅ |
| US-7.2 | Sebagai admin, saya ingin memfilter audit per kategori, aktor, dan waktu | ✅ |
| US-7.3 | Sebagai admin, saya ingin mengekspor audit ke CSV | ✅ |
| US-7.4 | Sebagai pengguna, saya ingin melihat aktivitas saya sendiri di halaman profil | ✅ |

### E-8 · Pelaporan

| ID | User Story | Status |
|---|---|---|
| US-8.1 | Sebagai komandan, saya ingin membuat laporan periodik | ❌ Halaman mock, menu dinonaktifkan |

---

## 4. Functional Requirements

### 4.1 Ingest Telemetri

| ID | Requirement | Status |
|---|---|---|
| FR-ING-01 | Sistem menerima burst satelit dalam bentuk hex melalui `POST /api/ingest` | ✅ |
| FR-ING-02 | Burst terdiri atas header 6 byte + 1..15 payload prajurit @21 byte | ✅ |
| FR-ING-03 | Hex tidak valid atau panjang tidak sesuai ditolak dengan `400` | ✅ |
| FR-ING-04 | Setiap payload menghasilkan **satu** rekaman `TELEMETRY` | ✅ |
| FR-ING-05 | Burst transport menghasilkan **satu** rekaman `UPLINK`, bukan rekaman prajurit | ✅ |
| FR-ING-06 | Byte asli burst disimpan apa adanya di `raw_hex` | ✅ |
| FR-ING-07 | Waktu kejadian disimpan sebagai UTC | ✅ |
| FR-ING-08 | Nama grup diambil dari master personel; `null` bila belum terdaftar | ✅ |
| FR-ING-09 | Paket duplikat (sama `packet_id` + `soldier_id` + waktu) tidak digandakan | ✅ |
| FR-ING-10 | Rute ingest lama (legacy) harus sudah tidak tersedia | ✅ Diuji |

### 4.2 Dekode Paket

| ID | Requirement | Status |
|---|---|---|
| FR-DEC-01 | Latitude/longitude didekode dari int32 berskala 1e7 | ✅ |
| FR-DEC-02 | Delapan flag kondisi didekode dari satu byte | ✅ |
| FR-DEC-03 | `position_source` dibaca dari 2 bit (indeks `>> 3`) menjadi salah satu dari `GNSS`, `DEAD_RECKONING`, `TRILATERATION`, `STALE` | ✅ |
| FR-DEC-04 | Saat chest strap terlepas, nilai vital diganti `TANPA VITAL` — bukan angka nol | ✅ |
| FR-DEC-05 | Freshness dihitung dari selisih waktu: `FRESH` ≤30 s, `AGING` ≤15 mnt, `STALE` >15 mnt | ✅ |

### 4.3 Explorer

| ID | Requirement | Status |
|---|---|---|
| FR-EXP-01 | Pencarian mendukung filter kategori, prajurit, grup, dan rentang waktu | ✅ |
| FR-EXP-02 | Rentang waktu mendukung preset termasuk `30d` dan `all` | ✅ |
| FR-EXP-03 | Hasil dapat dipaginasi | ✅ |
| FR-EXP-04 | Detail satu rekaman menampilkan seluruh field terdekode + hex mentah | ✅ |
| FR-EXP-05 | Opsi filter diisi dari data nyata, bukan daftar statis | ✅ |
| FR-EXP-06 | Hasil pencarian dapat diunduh sebagai CSV | ✅ |
| FR-EXP-07 | `is_sos` bukan filter bisnis Explorer; SOS tetap terlihat sebagai flag | ✅ Diuji eksplisit |

### 4.4 Alerts

| ID | Requirement | Jenis | Severity | Status |
|---|---|---|---|---|
| FR-ALR-01 | Flag `sos` membuka alert `SOS` | Flag | CRITICAL | ✅ |
| FR-ALR-02 | Flag `casualty` membuka alert `CASUALTY` | Flag | CRITICAL | ✅ |
| FR-ALR-03 | Flag `arrhythmia` membuka alert `ARRHYTHMIA` | Flag | CRITICAL | ✅ |
| FR-ALR-04 | Flag `low_battery` membuka alert `LOW_BATTERY` | Flag | WARNING | ✅ |
| FR-ALR-05 | Flag `heat_stress` membuka alert `HEAT_STRESS` | Flag | WARNING | ✅ |
| FR-ALR-06 | Strap terlepas membuka alert `STRAP_DISCONNECTED` | Flag | INFO | ✅ |
| FR-ALR-07 | Tidak ada telemetri >1.800 detik membuka alert `NO_CONTACT` | Waktu | INFO | ✅ |
| FR-ALR-08 | Satu alert terbuka per `(soldier_id, alert_type)`; episode berulang tidak menduplikasi | — | — | ✅ |
| FR-ALR-09 | Alert berpindah ke `CLEARED` saat kondisinya hilang | — | — | ✅ |
| FR-ALR-10 | Operator dapat `acknowledge` dan `resolve` dengan catatan | — | — | ✅ |
| FR-ALR-11 | Daftar alert dapat difilter per severity, status, prajurit, grup, waktu | — | — | ✅ |
| FR-ALR-12 | Daftar alert dapat diekspor CSV | — | — | ✅ |

Status alert: `ACTIVE` → `ACKNOWLEDGED` → `RESOLVED`; atau `ACTIVE`/`ACKNOWLEDGED` → `CLEARED`
(otomatis). `ACTIVE` dan `ACKNOWLEDGED` dihitung sebagai **terbuka**.

### 4.5 History

| ID | Requirement | Status |
|---|---|---|
| FR-HIS-01 | Track ditampilkan sebagai polyline berurutan waktu | ✅ |
| FR-HIS-02 | Lingkup kueri dapat `SOLDIER` atau `GROUP` | ✅ |
| FR-HIS-03 | Statistik mencakup jarak, durasi, dan kecepatan | ✅ |
| FR-HIS-04 | Grafik vitals menampilkan HR, SpO₂, dan suhu sepanjang waktu | ✅ |
| FR-HIS-05 | Playback dapat dijalankan, dijeda, dan diubah kecepatannya | ✅ |
| FR-HIS-06 | History membaca sumber yang sama dengan Explorer tanpa penghitungan ganda | ✅ Diuji |

### 4.6 Operations

| ID | Requirement | Status |
|---|---|---|
| FR-OPS-01 | Operasi memiliki lima status: `PLANNING`, `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED` | ✅ |
| FR-OPS-02 | Transisi dilakukan lewat aksi eksplisit: activate, hold, resume, complete, cancel | ✅ |
| FR-OPS-03 | Operasi hanya boleh dihapus pada status `PLANNING`, `COMPLETED`, atau `CANCELLED` | ✅ Diuji |
| FR-OPS-04 | Wizard membuat operasi, grup, anggota, dan geofence dalam **satu transaksi** | ✅ Diuji |
| FR-OPS-05 | Wizard menampilkan personel yang sama dengan peta dashboard | ✅ |
| FR-OPS-06 | Geofence yang sedang digambar ikut tersimpan saat pengguna menekan Next atau Create | ✅ |
| FR-OPS-07 | Jenis geofence: `restricted`, `safe`, `recon`, masing-masing berwarna berbeda | ✅ |
| FR-OPS-08 | Geofence disimpan sebagai poligon `[lng, lat]` dan dirender `[lat, lng]` | ✅ |
| FR-OPS-09 | Poligon tidak valid (<3 titik) diabaikan, bukan merusak render peta | ✅ |
| FR-OPS-10 | Satu operasi menampilkan ringkasan: personel, grup, zona, alert, tiket | ✅ |
| FR-OPS-11 | Grup dan geofence dapat ditautkan atau dilepas dari operasi melalui API | ✅ |

### 4.7 Personnel & Groups

| ID | Requirement | Status |
|---|---|---|
| FR-PER-01 | Grup **tidak** di-seed; Settings mulai kosong sampai operasi/admin membuatnya | ✅ Diuji |
| FR-PER-02 | Telemetri dari prajurit tanpa master meninggalkan `group = null` | ✅ Diuji |
| FR-PER-03 | Setelah personel diikat ke grup, telemetri berikutnya diperkaya nama grup | ✅ Diuji |
| FR-PER-04 | Pembacaan `/api/groups` dan `/api/personnel` memerlukan sesi | ✅ Diuji |

### 4.8 Tickets

| ID | Requirement | Status |
|---|---|---|
| FR-TIK-01 | Tiket hanya dapat dibuat dari sebuah alert | ✅ Diuji |
| FR-TIK-02 | Prioritas tiket diturunkan dari severity alert (`WARNING`→`HIGH`, `INFO`→`LOW`) | ✅ |
| FR-TIK-03 | Status tiket: `OPEN`, `IN_PROGRESS`, `WAITING`, `RESOLVED`, `CLOSED` | ✅ |
| FR-TIK-04 | Tiket mendukung kolaborator, task (`TODO`/`IN_PROGRESS`/`DONE`), dan update | ✅ |
| FR-TIK-05 | Visibilitas tiket mengikuti pengguna yang sedang masuk | ✅ Diuji |

### 4.9 Autentikasi, Peran, Profil

| ID | Requirement | Status |
|---|---|---|
| FR-SEC-01 | Login memverifikasi password dan mengembalikan akses aktif | ✅ Diuji |
| FR-SEC-02 | Password disimpan sebagai PBKDF2-SHA256 120.000 iterasi | ✅ |
| FR-SEC-03 | Sesi berupa token opaque 256-bit dengan TTL 7 hari | ✅ |
| FR-SEC-04 | Token dikirim sebagai `Authorization: Bearer <token>` | ✅ |
| FR-SEC-05 | Satu pengguna hanya boleh memiliki satu binding peran | ✅ `UNIQUE(user_id)` |
| FR-SEC-06 | Izin memakai pola `<domain>` (semua aksi) atau `<domain>.read` (baca saja) | ✅ |
| FR-SEC-07 | Peran sistem tidak dapat diubah atau dihapus | ✅ |
| FR-SEC-08 | Profil dapat memperbarui nama, email, dan gambar — **bukan** peran atau status | ✅ Diuji |
| FR-SEC-09 | Audit mencatat aktor dari sesi, bukan dari body request | ✅ Diuji |

### 4.10 Audit

| ID | Requirement | Status |
|---|---|---|
| FR-AUD-01 | Setiap aksi tercatat dengan aktor, kategori, aksi, dan waktu | ✅ |
| FR-AUD-02 | Audit dapat difilter per kategori, aktor, status, dan rentang waktu | ✅ |
| FR-AUD-03 | Audit dapat diekspor CSV | ✅ |
| FR-AUD-04 | Pengguna dapat melihat aktivitasnya sendiri | ✅ |
| FR-AUD-05 | Baris audit tidak dapat diubah atau dihapus | ✅ `DELETE /audit-logs/:eventId` selalu `405`; tidak ada endpoint update |
| FR-AUD-06 | Klien bersesi dapat menulis baris audit untuk aksi sisi-FE | ✅ `POST /audit-logs` (butuh sesi) |

### 4.11 Simulator dan Retensi

| ID | Requirement | Status |
|---|---|---|
| FR-SIM-01 | Saat basis data kosong, sistem men-seed 24 jam telemetri untuk 15 prajurit | ✅ |
| FR-SIM-02 | Setelah seed, simulator melanjutkan 1 tick setiap 30 detik memakai waktu nyata | ✅ |
| FR-SIM-03 | Bila data tertinggal lebih dari 2 interval, simulator melakukan catch-up (maks 20 tick) | ✅ |
| FR-SIM-04 | Simulator dapat dimatikan lewat `TRACKFORGE_LIVE_SIM=0` | ✅ |
| FR-SIM-05 | Telemetri >30 hari dihapus otomatis; data master tidak terpengaruh | ✅ Diuji |

---

## 5. Non-Functional Requirements

### 5.1 Kinerja

| ID | Requirement | Kondisi nyata |
|---|---|---|
| NFR-PRF-01 | Dekode dan simpan satu burst 15 prajurit harus sinkron tanpa queue | ✅ better-sqlite3 sinkron |
| NFR-PRF-02 | Explorer harus memakai index untuk kueri rentang waktu | ⚠️ Index `(is_sos, event_time, id)` dan `(is_sos, category, data_type)` — kolom pemimpin `is_sos` selalu `0`, lihat dok 05 §7 |
| NFR-PRF-03 | Peta tidak boleh macet pada 15 marker + beberapa poligon | ✅ |
| NFR-PRF-04 | Login berbiaya CPU tinggi (PBKDF2 120k, sinkron) | ⚠️ Tanpa rate limit → risiko DoS (R-7) |
| NFR-PRF-05 | Tile peta di-proxy dan di-cache | ✅ Route `/tiles/[z]/[x]/[y]` |

### 5.2 Keandalan

| ID | Requirement | Kondisi nyata |
|---|---|---|
| NFR-REL-01 | Data bertahan melewati deploy | ✅ Volume Railway via `RAILWAY_VOLUME_MOUNT_PATH` |
| NFR-REL-02 | Operasi tulis majemuk harus transaksional | ✅ Wizard operasi |
| NFR-REL-03 | Kesalahan simulator tidak boleh menjatuhkan proses | ✅ `try/catch` + log warning |
| NFR-REL-04 | Poligon rusak tidak boleh merusak halaman | ✅ Parser toleran di BE dan FE |
| NFR-REL-05 | Tidak ada replikasi atau failover basis data | ❌ Risiko R-1 |

### 5.3 Keamanan

| ID | Requirement | Kondisi nyata |
|---|---|---|
| NFR-SEC-01 | Alamat backend tidak boleh terlihat dari browser | ✅ `EXPLORER_API_BASE` server-only |
| NFR-SEC-02 | Password tidak boleh disimpan dalam bentuk dapat dibalik | ✅ PBKDF2 + salt |
| NFR-SEC-03 | Semua endpoint mutasi harus memerlukan sesi | ❌ Lihat R-2 |
| NFR-SEC-04 | Input harus divalidasi di batas HTTP | ⚠️ `ValidationPipe` aktif tetapi DTO belum dipasang |
| NFR-SEC-05 | Harus ada rate limiting pada login dan ingest | ❌ Risiko R-7 |
| NFR-SEC-06 | Pesan error tidak boleh membocorkan internal | ❌ Risiko R-8 |
| NFR-SEC-07 | Token sesi tidak boleh tersimpan dalam bentuk plaintext yang dapat dibaca | ❌ Risiko R-9 |

### 5.4 Usability

| ID | Requirement | Kondisi nyata |
|---|---|---|
| NFR-USA-01 | Tema gelap yang nyaman di ruang kendali | ✅ `--bg #07101c` |
| NFR-USA-02 | Peta tetap gelap agar konsisten | ✅ Filter SVG "night" pada tile OSM |
| NFR-USA-03 | Deep link dapat dibagikan antar operator | ✅ `?soldier=`, `?record=`, `?alert=`, `?op=` lewat `searchParams` server |
| NFR-USA-04 | Layout harus bertahan di layar 1100 px dan 860 px | ✅ Media query bertingkat |
| NFR-USA-05 | Bahasa antarmuka Inggris, satuan metrik | ✅ |

### 5.5 Maintainability

| ID | Requirement | Kondisi nyata |
|---|---|---|
| NFR-MNT-01 | Satu sumber kebenaran skema basis data | ✅ `DatabaseService.initDb()` |
| NFR-MNT-02 | Satu pola konsisten per halaman FE (page → view → css) | ✅ |
| NFR-MNT-03 | Pengujian e2e menutupi alur kritis | ✅ 40 test e2e, semuanya lulus (lihat dok 08) |
| NFR-MNT-04 | Entity TypeORM tidak boleh menyesatkan sebagai skema aktif | ⚠️ Masih ada sebagai stub |
| NFR-MNT-05 | Migrasi tidak boleh menghapus data | ❌ `initDb` dapat `DROP TABLE` (R-6) |

---

## 6. Aturan Bisnis

| ID | Aturan |
|---|---|
| BR-01 | Prajurit diidentifikasi oleh `soldier_id` (kunci bisnis), bukan `personnel.id` |
| BR-02 | Grup direferensikan **berdasarkan nama** pada telemetri dan alert — bukan foreign key |
| BR-03 | Sistem tidak pernah mengarang nama grup; tanpa master, nilainya `null` |
| BR-04 | Satu alert terbuka per prajurit per jenis alert |
| BR-05 | Satu alert dapat memiliki paling banyak satu tiket (`UNIQUE source_alert_id`) |
| BR-06 | Satu pengguna memiliki tepat satu peran |
| BR-07 | Peran `is_system` tidak dapat diubah atau dihapus |
| BR-08 | Operasi `ACTIVE` dan `ON_HOLD` tidak dapat dihapus |
| BR-09 | Telemetri lebih tua dari 30 hari dihapus; tabel master dikecualikan |
| BR-10 | Sesi kedaluwarsa 7 hari setelah dibuat (absolut, tidak diperpanjang aktivitas) |
| BR-11 | Geofence disimpan `[lng, lat]`; kurang dari 3 titik dianggap tidak valid |
| BR-12 | Hanya rekaman `TELEMETRY` yang mewakili data prajurit; `UPLINK` adalah metadata transport |

---

## 7. Acceptance Criteria Lintas Fitur

Diambil dari perilaku yang diverifikasi test e2e (rincian di dok 08):

| ID | Kriteria | Test |
|---|---|---|
| AC-01 | Satu payload prajurit berukuran tepat 21 byte dan dapat didekode | `satellite-burst` A |
| AC-02 | Burst multi-prajurit menghasilkan satu rekaman TELEMETRY per prajurit | `satellite-burst` B |
| AC-03 | Byte burst asli tersimpan utuh | `satellite-burst` C |
| AC-04 | Prajurit tanpa master tetap tersimpan tanpa mengarang roster | `satellite-burst` E |
| AC-05 | Flag membuat alert SOS/casualty/aritmia/baterai/heat stress | `satellite-burst` F |
| AC-06 | Burst sendiri bukan telemetri palsu dan tidak membuat alert | `satellite-burst` G |
| AC-07 | Retensi menghapus telemetri lama, bukan tabel master | `api` |
| AC-08 | Episode aritmia berulang tidak menduplikasi alert | `api` |
| AC-09 | NO_CONTACT ter-clear saat telemetri kembali | `api` |
| AC-10 | History tidak menghitung ganda rekaman Explorer | `api` |
| AC-11 | Login memvalidasi password dan mengembalikan akses aktif | `api` |
| AC-12 | Audit mencatat aktor dari sesi, bukan dari input | `api` |
| AC-13 | Wizard membuat grup + geofence dalam satu transaksi | `operations` |
| AC-14 | Operasi `ACTIVE` tidak dapat dihapus | `operations` |
| AC-15 | Profil tidak dapat mengubah peran atau status | `profile` |
| AC-16 | Tiket hanya lahir dari alert | `tickets` |

---

## 8. Prioritas Pengembangan Lanjutan

| Prioritas | Item | Alasan |
|---|---|---|
| **P0** | Aktifkan guard autentikasi global (R-2, R-4) | Endpoint identitas terbuka tanpa autentikasi |
| **P0** | Hentikan reset kredensial default setiap boot (R-3) | Akses penuh bagi penyerang |
| **P0** | Hentikan penyimpanan token sesi di `audit_logs` + lindungi endpoint audit (R-9) | Token dapat dipanen |
| **P1** | Rate limiting login & ingest (R-7) | Brute force dan DoS |
| **P1** | Ganti `DROP TABLE` dengan migrasi aman (R-6) | Risiko kehilangan data |
| **P1** | Pasang DTO validasi pada controller operations & tickets (R-5) | Integritas input |
| **P2** | Migrasi ke PostgreSQL (R-1) | Skala dan keandalan |
| **P2** | UI tiket penuh (US-3.7) | API sudah siap, nilai cepat |
| **P2** | Editor izin peran (US-6.5) | Peran kustom belum berguna |
| **P3** | Laporan nyata (US-8.1) | Masih mock |
| **P3** | Pelacakan senjata (US-1.5) | Masih hardcoded |
