# Stiker WA - Website Kumpulan Stiker WhatsApp

Ini adalah proyek website untuk berbagi dan menemukan stiker WhatsApp, dibangun dengan HTML, CSS, dan JavaScript vanilla, dengan backend menggunakan Supabase.

## Panduan Pengaturan Backend Supabase

Ini adalah panduan satu kali untuk menyiapkan semua yang kita butuhkan di sisi server.

### Bagian 1: Buat Proyek Supabase Baru

1.  Buka [supabase.com](https://supabase.com) dan klik "**Start your project**".
2.  Login atau daftar jika Anda belum punya akun.
3.  Di dasbor, klik "**New project**".
4.  Pilih organisasi, berikan **Nama Proyek**, buat **Kata Sandi Database** yang kuat, dan pilih **Wilayah**.
5.  Klik "**Create new project**".

### Bagian 2: Jalankan Skrip SQL Lengkap

Selanjutnya, kita akan membuat semua struktur database (tabel, fungsi, dan view) dengan menjalankan satu skrip SQL.

1.  Dari sidebar kiri proyek Supabase Anda, klik ikon **SQL Editor**.
2.  Klik "**New query**".
3.  Salin **seluruh** skrip SQL di bawah ini, tempelkan ke dalam editor, dan klik "**RUN**".

```sql
-- ========= BAGIAN 1: PEMBUATAN TABEL DASAR =========

-- 1.1. TABEL KATEGORI
CREATE TABLE public.categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_name_key UNIQUE (name)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to everyone" ON public.categories FOR SELECT USING (true);

-- 1.2. TABEL STIKER
CREATE TABLE public.stickers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    image_url text NOT NULL,
    tags text[],
    category_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT stickers_pkey PRIMARY KEY (id),
    CONSTRAINT stickers_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id),
    CONSTRAINT stickers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to everyone" ON public.stickers FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.stickers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow delete for owners" ON public.stickers FOR DELETE USING (auth.uid() = user_id);

-- 1.3. TABEL LIKES
CREATE TABLE public.likes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    sticker_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT likes_pkey PRIMARY KEY (id),
    CONSTRAINT likes_sticker_id_fkey FOREIGN KEY (sticker_id) REFERENCES public.stickers(id) ON DELETE CASCADE,
    CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT likes_user_id_sticker_id_key UNIQUE (user_id, sticker_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Allow insert and delete for authenticated users" ON public.likes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 1.4. TABEL FAVORITES (BOOKMARKS)
CREATE TABLE public.favorites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    sticker_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT favorites_pkey PRIMARY KEY (id),
    CONSTRAINT favorites_sticker_id_fkey FOREIGN KEY (sticker_id) REFERENCES public.stickers(id) ON DELETE CASCADE,
    CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT favorites_user_id_sticker_id_key UNIQUE (user_id, sticker_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow access for owners" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 1.5. TABEL KOMENTAR
CREATE TABLE public.comments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    sticker_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT comments_pkey PRIMARY KEY (id),
    CONSTRAINT comments_sticker_id_fkey FOREIGN KEY (sticker_id) REFERENCES public.stickers(id) ON DELETE CASCADE,
    CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow delete for owners" ON public.comments FOR DELETE USING (auth.uid() = user_id);


-- ========= BAGIAN 2: PROFIL PENGGUNA =========
-- Membuat tabel `profiles` untuk data publik dan trigger untuk mengisinya secara otomatis.

-- 2.1. TABEL PROFIL
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text,
  avatar_url text,
  updated_at timestamptz,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2.2. FUNGSI DAN TRIGGER OTOMATIS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ========= BAGIAN 3: FUNGSI DAN VIEW UNTUK PERFORMA =========

-- 3.1. FUNGSI UNTUK TRENDING STICKERS
DROP FUNCTION IF EXISTS get_trending_stickers();
CREATE OR REPLACE FUNCTION get_trending_stickers()
RETURNS TABLE (id uuid, title text, image_url text, like_count bigint)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.title, s.image_url, count(l.id) as like_count
    FROM public.stickers s JOIN public.likes l ON s.id = l.sticker_id
    WHERE l.created_at >= (now() - interval '24 hours')
    GROUP BY s.id ORDER BY like_count DESC LIMIT 5;
END;
$$;

-- 3.2. VIEW UNTUK MENGGABUNGKAN STIKER DENGAN JUMLAH LIKE/KOMENTAR
DROP VIEW IF EXISTS public.stickers_with_counts;
CREATE VIEW public.stickers_with_counts AS
SELECT
    s.id,
    s.title,
    s.image_url,
    s.tags,
    s.created_at,
    s.user_id,
    p.username AS creator_username,
    (SELECT count(*) FROM public.likes l WHERE l.sticker_id = s.id) AS like_count,
    (SELECT count(*) FROM public.comments c WHERE c.sticker_id = s.id) AS comment_count
FROM
    public.stickers s
LEFT JOIN
    public.profiles p ON s.user_id = p.id;

```

### Bagian 3: Siapkan Supabase Storage

Di sinilah kita akan menyimpan semua file gambar stiker.

1.  Dari sidebar kiri, klik ikon **Storage**.
2.  Klik "**Create a new bucket**" dan beri nama `stickers`.
3.  Biarkan bucket sebagai **Public**.
4.  Setelah bucket dibuat, pergi ke "**Policies**".
5.  Buat dua kebijakan baru (hapus yang lama jika ada):
    *   **Untuk Melihat Stiker (select):** Beri nama `Allow public read access`, centang `select`, dan gunakan `(bucket_id = 'stickers')` sebagai definisi.
    *   **Untuk Mengunggah Stiker (insert):** Beri nama `Allow authenticated uploads`, centang `insert`, dan gunakan `(bucket_id = 'stickers' AND auth.role() = 'authenticated')` sebagai definisi.

### Bagian 4: Dapatkan Kunci API Anda

Terakhir, kita perlu kredensial untuk menghubungkan situs web kita.

1.  Di sidebar kiri, klik ikon roda gigi (**Project Settings**) > **API**.
2.  Salin **Project URL** dan kunci `anon` `public`.
3.  Tempelkan nilai-nilai ini ke dalam file `js/app-config.js` di proyek Anda.
---
Setelah Anda menyelesaikan semua empat bagian di atas, proyek Anda siap dijalankan.

## Status Proyek (Per 28-08-2025)

Proyek ini mengimplementasikan sebagian besar fitur inti yang diminta. Berikut adalah ringkasan statusnya:

### Fitur yang Sudah Selesai:
- **Autentikasi Pengguna:** Pendaftaran, Login, Logout.
- **Feed Stiker:** Tampilan stiker terbaru dengan infinite scroll.
- **Unggah Stiker:** Fungsionalitas unggah melalui modal, termasuk penyimpanan ke Supabase Storage.
- **Interaktivitas:** Pengguna dapat **menyukai/tidak menyukai** stiker, **memfavoritkan/membatalkan favorit**, dan **mengunduh** stiker.
- **Pencarian:** Pencarian stiker berdasarkan judul atau tag.
- **Trending:** Sidebar menampilkan 5 stiker paling populer dalam 24 jam terakhir.
- **Halaman Profil:** Menampilkan tab untuk stiker yang diunggah pengguna dan yang telah difavoritkan.
- **Desain Responsif:** Tampilan disesuaikan untuk desktop dan seluler.

### Fitur yang Belum Diimplementasikan (Pekerjaan di Masa Depan):
- **Komentar:** Tombol komentar ada di UI tetapi dinonaktifkan. Fungsionalitas untuk melihat atau menambah komentar belum dibuat.
- **Halaman Jelajah & Bookmark:** Tautan navigasi "Jelajah" dan "Bookmark" dinonaktifkan. Fungsionalitas untuk halaman-halaman ini belum dibuat.
- **Notifikasi Real-time:** Tidak ada notifikasi saat stiker disukai atau dikomentari.
- **Sistem Follow & Report:** Belum diimplementasikan.
- **Dark Mode Toggle:** Skema warna untuk dark mode sudah ada di CSS, tetapi tombol untuk mengaktifkannya belum dibuat.
