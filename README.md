# Catatan Keuangan

Aplikasi web/PWA untuk mencatat tanggal, tipe transaksi, nominal, dan
keterangan, mengedit transaksi yang sudah dicatat, serta melihat laporan per bulan. Catatan disimpan di penyimpanan
lokal browser (IndexedDB) pada HP; transaksi tidak dikirim atau disinkronkan ke
server. Database komputer dari versi sebelumnya tidak dihapus, tetapi datanya
tidak otomatis dipindahkan ke PWA ini.

## GitHub Pages gratis

GitHub Pages dapat meng-host situs statis (HTML, CSS, dan JavaScript). Versi
aplikasi di folder `docs` sudah disiapkan untuk GitHub Pages, termasuk path
relatif agar PWA tetap bekerja pada alamat proyek seperti
`https://USERNAME.github.io/NAMA-REPOSITORY/`. GitHub Pages tersedia gratis
untuk repository publik pada paket GitHub Free ([fitur paket GitHub](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)).
Situs yang diterbitkan dapat
dilihat publik, tetapi isi transaksi tetap hanya tersimpan di browser HP.

Untuk menerbitkan:

1. Buat repository baru di GitHub dan unggah seluruh isi folder proyek ini.
   Gunakan repository **Public** agar GitHub Free dapat menerbitkan Pages.
2. Pada repository, buka **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**.
4. Pilih branch `main`, folder `/docs`, lalu tekan **Save**.
5. Setelah proses penerbitan selesai, buka `https://USERNAME.github.io/NAMA-REPOSITORY/`
   dari browser HP.
6. Pasang aplikasi:
   - Android: Chrome → menu → **Install app** atau **Tambahkan ke layar utama**.
   - iPhone: Safari → **Bagikan** → **Tambahkan ke Layar Utama**.

GitHub Pages memerlukan repository GitHub dan aktivasi Pages oleh pemilik akun;
proyek ini belum diterbitkan ke akun GitHub mana pun. Jangan unggah file database,
cadangan transaksi, atau data pribadi ke repository.

## Menjalankan pratinjau lokal

Python/Flask hanya diperlukan untuk pratinjau dari komputer:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Buka `http://127.0.0.1:5000`. Untuk memasang PWA dari HP, gunakan alamat HTTPS
GitHub Pages, bukan alamat IP lokal komputer.

## Penyimpanan

PWA bisa dibuka offline setelah halaman pertama kali dibuka dan service worker
selesai dipasang. Catatan terpisah untuk setiap browser/perangkat dan dapat
hilang jika data situs/browser dihapus; catatan tidak otomatis tersinkron.
GitHub Pages hanya menerima berkas aplikasi dan menyajikannya, bukan menerima
atau menyimpan transaksi.

## Cadangkan dan pindahkan catatan ke HP baru

1. Di HP lama, buka aplikasi dan tekan **Unduh cadangan**. File JSON berisi
   transaksi; simpan file di tempat aman dan jangan unggah ke repository publik.
2. Pindahkan file tersebut ke HP baru, misalnya melalui kabel atau penyimpanan
   cloud pribadi.
3. Buka aplikasi pada HP baru dan tekan **Pulihkan cadangan**, lalu pilih file
   JSON yang tadi dipindahkan.

Pemulihan menggabungkan catatan ke penyimpanan HP yang sedang dipakai; catatan
yang sudah ada tidak dihapus. Duplikat yang sama dilewati, dan benturan ID
antara catatan berbeda disimpan sebagai catatan baru. File cadangan memuat data
keuangan pribadi, jadi simpan dan kirim hanya melalui tempat yang Anda percaya.

## Mengedit transaksi

Tekan tombol **Edit** di baris transaksi yang ingin diperbaiki. Form akan terisi
dengan data transaksi tersebut; ubah kolom yang diperlukan, lalu tekan
**Simpan perubahan**. Perubahan memperbarui transaksi yang sama, bukan
menambahkan transaksi baru. Tekan **Batal edit** untuk membatalkan.

Setelah menyimpan, tombol menampilkan proses singkat lalu notifikasi sukses
dengan nama dan nominal transaksi. Notifikasi muncul di bagian bawah layar
selama beberapa detik; jika penyimpanan gagal, pesan kesalahan juga ditampilkan.

## Melihat laporan per bulan

Di bagian **Laporan Bulanan**, pilih bulan dan tahun pada **Pilih bulan laporan**.
Ringkasan pemasukan, pengeluaran, sisa bersih, dan riwayat transaksi akan
menampilkan bulan yang dipilih. Pilih bulan lain untuk membandingkan laporan.

Jika perubahan aplikasi belum muncul di HP, buka halaman GitHub Pages saat
terhubung internet dan muat ulang. Jangan hapus data situs/browser untuk
memperbarui aplikasi karena tindakan itu dapat menghapus transaksi lokal.

Dokumentasi: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
dan [sumber penerbitan](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
