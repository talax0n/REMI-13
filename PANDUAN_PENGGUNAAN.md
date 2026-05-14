# Panduan Penggunaan Aplikasi Turnamen Remi 13

Panduan ini ditujukan untuk **panitia** yang mengelola turnamen. Tidak diperlukan pengetahuan teknis — cukup ikuti langkah-langkah di bawah ini.

---

## Daftar Isi

1. [Gambaran Umum Aplikasi](#1-gambaran-umum-aplikasi)
2. [Struktur Turnamen](#2-struktur-turnamen)
3. [Login Admin](#3-login-admin)
4. [Mengelola Peserta](#4-mengelola-peserta)
5. [Mengacak Meja (Shuffle)](#5-mengacak-meja-shuffle)
6. [Mencatat Skor](#6-mencatat-skor)
7. [Alur Lengkap Satu Fase](#7-alur-lengkap-satu-fase)
8. [Tampilan Peserta (Player Portal)](#8-tampilan-peserta-player-portal)
9. [Layar Publik (Leaderboard)](#9-layar-publik-leaderboard)
10. [Fungsi Darurat & Koreksi](#10-fungsi-darurat--koreksi)

---

## 1. Gambaran Umum Aplikasi

Aplikasi ini terdiri dari **3 halaman utama**:

| Halaman         | Alamat              | Untuk Siapa                            |
| --------------- | ------------------- | -------------------------------------- |
| **Admin**       | `/admin`            | Panitia (dilindungi kata sandi)        |
| **Peserta**     | `/player`           | Pemain yang ingin melihat skor pribadi |
| **Leaderboard** | `/` (halaman utama) | Semua penonton & peserta               |

Semua data tersimpan di server — setiap perubahan yang dilakukan admin langsung terlihat oleh peserta dan penonton secara **real-time**.

---

## 2. Struktur Turnamen

Turnamen terdiri dari **6 fase**:

| Fase | Nama           | Peserta                           |
| ---- | -------------- | --------------------------------- |
| 1    | Fase Reguler 1 | Semua peserta aktif               |
| 2    | Fase Reguler 2 | Semua peserta aktif               |
| 3    | Fase Reguler 3 | Semua peserta aktif               |
| 4    | Fase Reguler 4 | Semua peserta aktif               |
| 5    | Semifinal      | **Top 20** berdasarkan total skor |
| 6    | Final          | **Top 10** berdasarkan total skor |

> **Catatan:** Setiap meja terdiri dari **5 pemain**. Sistem akan mengacak penempatan meja secara otomatis dengan memastikan anggota dari team yang sama tidak terlalu banyak duduk di meja yang sama.

---

## 3. Login Admin

1. Buka browser dan akses alamat aplikasi, lalu tambahkan `/admin` di akhir URL.
2. Masukkan **kata sandi admin** yang telah diberikan.
3. Klik tombol **Login**.
4. Anda akan diarahkan ke halaman admin.

> Untuk keluar, klik tombol **Logout** di pojok kanan atas halaman admin.

---

## 4. Mengelola Peserta

Setelah login, Anda akan melihat dua tab: **Peserta** dan **Penilaian Meja**. Mulai dari tab **Peserta**.

### Menambah Peserta Satu per Satu

1. Di kolom kiri, temukan bagian **"Tambah Peserta"**.
2. Isi **Nama** peserta.
3. Pilih **Team** dari dropdown.
4. Klik tombol **Tambah**.

### Mengimpor Peserta dari File CSV (Massal)

Jika peserta sudah tercatat dalam file spreadsheet (Excel/Google Sheets):

1. Ekspor file tersebut menjadi format **CSV**.
2. Di kolom kiri, temukan bagian **"Import CSV"**.
3. Klik tombol **Pilih File** dan pilih file CSV Anda.
4. Pratinjau data akan ditampilkan — pastikan nama dan team sudah benar.
5. Klik **Import** untuk menyimpan semua peserta sekaligus.

### Menonaktifkan Peserta (Tidak Hadir / Belum Bayar)

Jika ada peserta yang tidak jadi ikut turnamen:

1. Temukan nama peserta di tabel (kolom kanan).
2. Klik tombol **toggle status** pada baris peserta tersebut.
3. Status peserta akan berubah menjadi **Tidak Aktif** — peserta ini tidak akan dimasukkan dalam pengacakan meja.

### Menghapus Peserta

1. Klik tombol **hapus** (ikon tempat sampah) pada baris peserta.
2. Konfirmasi penghapusan.

---

## 5. Mengacak Meja (Shuffle)

Setelah semua peserta terdaftar dan aktif, langkah berikutnya adalah **mengacak penempatan meja**.

1. Di kolom kiri tab **Peserta**, temukan bagian **"Generate / Shuffle Meja"**.
2. Anda akan melihat informasi: jumlah peserta dan jumlah meja yang akan dibuat.
3. Klik tombol biru **"Generate / Shuffle Tables"**.
4. Sebuah dialog konfirmasi akan muncul:
   - Untuk **Fase 1–3**: Konfirmasi pengacakan ulang semua penempatan meja.
   - Untuk **Fase 4**: Peringatan bahwa ini akan memilih **top 20** untuk Semifinal.
   - Untuk **Fase 5**: Peringatan bahwa ini akan memilih **top 10** untuk Final.
5. Klik **Konfirmasi** untuk melanjutkan.
6. Sistem akan memproses dalam beberapa detik — meja akan muncul di tab **Penilaian Meja**.

> **Algoritma Pengacakan:** Sistem secara otomatis memastikan anggota dari team yang sama tersebar ke meja yang berbeda, dan menghindari pertemuan ulang antar pemain yang sudah pernah satu meja di fase sebelumnya.

---

## 6. Mencatat Skor

Setelah satu fase selesai dimainkan, panitia mencatat skor di tab **Penilaian Meja**.

1. Klik tab **Penilaian Meja** di bagian atas halaman admin.
2. Anda akan melihat semua meja dalam bentuk kartu (Meja 1, Meja 2, dst.).
3. Klik salah satu **kartu meja** untuk membuka form penilaian.
4. Untuk setiap pemain di meja tersebut, masukkan **skor fase ini** di kolom input.
5. Klik tombol **Simpan Skor**.
6. Ulangi untuk semua meja.

> Skor yang dimasukkan adalah **poin untuk fase ini saja** (bukan kumulatif). Sistem akan secara otomatis menjumlahkan total skor semua fase.

---

## 7. Alur Lengkap Satu Fase

Berikut urutan kerja panitia untuk **setiap fase**:

```
1. [Jika Fase 1] Daftarkan semua peserta
         ↓
2. Klik "Generate / Shuffle Tables"
         ↓
3. Konfirmasi dialog pengacakan
         ↓
4. Fase dimainkan oleh peserta
         ↓
5. Tab "Penilaian Meja" → masukkan skor tiap meja → Simpan
         ↓
6. Ulangi dari langkah 2 untuk fase berikutnya
```

Setelah **Fase 4** selesai dan di-shuffle ke Fase 5, sistem otomatis hanya mengambil **20 peserta dengan skor tertinggi**. Peserta lainnya otomatis dieliminasi.

Setelah **Fase 5** selesai dan di-shuffle ke Fase 6, sistem otomatis hanya mengambil **10 peserta dengan skor tertinggi**.

---

## 8. Tampilan Peserta (Player Portal)

Peserta dapat melihat skor dan peringkat mereka sendiri melalui halaman khusus.

### Cara Berbagi ke Peserta

1. Di halaman admin, klik tombol **"Player QR"** di bagian atas.
2. Sebuah QR code akan muncul.
3. Tampilkan QR code ini di layar/proyektor, atau bagikan gambarnya.

### Cara Peserta Menggunakan

1. Peserta membuka kamera HP dan scan QR code.
2. Browser akan terbuka ke halaman `/player`.
3. Peserta mengetik nama mereka (ada autocomplete).
4. Peserta memilih team mereka.
5. Klik **"Cari Skor Saya"**.
6. Peserta akan melihat:
   - Total skor kumulatif
   - Peringkat saat ini
   - Rincian skor per fase (Fase 1 s/d 6)
   - Nomor meja di tiap fase

---

## 9. Layar Publik (Leaderboard)

Halaman utama aplikasi (`/`) dapat ditampilkan di layar besar/proyektor untuk semua penonton.

### Tampilan Leaderboard

- Menampilkan **semua peserta** diurutkan dari skor tertinggi.
- Ikon khusus untuk peringkat 1, 2, 3 (mahkota, perak, perunggu).
- **Update otomatis** setiap kali admin menyimpan skor baru — tidak perlu refresh halaman.

### Tampilan Meja

- Tab kedua menampilkan **penempatan meja** fase saat ini.
- Berguna untuk memberitahu peserta di meja mana mereka harus duduk.
- Juga update otomatis setelah admin melakukan shuffle.

> **Tips:** Buka halaman ini di laptop/komputer yang terhubung ke proyektor. Halaman akan terus update sendiri selama turnamen berlangsung.

---

## 10. Fungsi Darurat & Koreksi

### Mundur Satu Fase (Undo)

Jika terjadi kesalahan saat berpindah fase:

1. Di bagian atas halaman admin, klik tombol **panah kiri** di sebelah indikator fase.
2. Konfirmasi peringatan yang muncul.
3. Sistem akan kembali ke fase sebelumnya.

> Gunakan ini hanya jika benar-benar terjadi kesalahan. Aksi ini dapat mempengaruhi data skor yang sudah tercatat.

### Mengoreksi Skor yang Salah

Jika skor yang sudah disimpan ternyata salah:

1. Buka tab **Penilaian Meja**.
2. Klik meja yang ingin dikoreksi.
3. Masukkan skor yang benar.
4. Klik **Simpan Skor** — skor lama akan ditimpa.

### Reset Semua Skor

Jika ingin mengulang perhitungan skor dari awal (tanpa menghapus data peserta):

1. Klik tombol **"Reset All Scores"** di bagian atas halaman admin.
2. Konfirmasi peringatan.
3. Semua skor akan dikosongkan, fase kembali ke 1.

### Reset Database (Mulai dari Awal Total)

Jika ingin menghapus **semua data** dan memulai dari nol:

1. Klik tombol **"Reset DB"** di bagian atas halaman admin.
2. Baca peringatan dengan seksama.
3. Konfirmasi.
4. Semua data peserta, skor, dan penempatan meja akan dihapus.

> **Peringatan:** Aksi ini **tidak bisa dibatalkan**. Pastikan sudah yakin sebelum melanjutkan.

---

## Ringkasan Tombol Penting di Halaman Admin

| Tombol                        | Fungsi                                       |
| ----------------------------- | -------------------------------------------- |
| **Generate / Shuffle Tables** | Mengacak penempatan meja untuk fase saat ini |
| **Player QR**                 | Menampilkan QR code untuk peserta            |
| **Reset All Scores**          | Menghapus semua skor (peserta tetap ada)     |
| **Reset DB**                  | Menghapus semua data (mulai dari nol)        |
| **Logout**                    | Keluar dari halaman admin                    |
| **Panah kiri (fase)**         | Mundur satu fase                             |

---

_Aplikasi Turnamen Remi 13 — Panduan Panitia_
