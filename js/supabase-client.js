// js/supabase-client.js

// Periksa apakah konfigurasi Supabase sudah ada
if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
    console.error("Kesalahan: Konfigurasi Supabase tidak ditemukan atau tidak lengkap.");
    console.error("Pastikan Anda sudah membuat file `config.js` dan mengisi URL serta ANON_KEY dari proyek Supabase Anda.");
}

// Inisialisasi klien Supabase
const supabase = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// Cek apakah klien berhasil diinisialisasi
if (!supabase) {
    console.error("Gagal menginisialisasi klien Supabase. Periksa kembali konfigurasi Anda.");
} else {
    console.log("Klien Supabase berhasil diinisialisasi.");
}
