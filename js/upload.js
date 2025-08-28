// js/upload.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const uploadModal = document.getElementById('upload-modal');
    const openModalButton = document.querySelector('.tweet-button'); // Tombol "Unggah Stiker"
    const closeModalButton = document.querySelector('.close-button');
    const uploadForm = document.getElementById('sticker-upload-form');
    const fileInput = document.getElementById('sticker-file-input');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const previewLabel = document.querySelector('.file-label');
    const categorySelect = document.getElementById('sticker-category');
    const submitButton = document.getElementById('upload-submit-button');
    const errorDiv = document.getElementById('upload-error');

    // --- Modal Control ---
    // Buka modal saat tombol "Unggah Stiker" diklik
    if (openModalButton) {
        openModalButton.addEventListener('click', () => {
            uploadModal.style.display = 'block';
            loadCategories(); // Muat kategori saat modal dibuka
        });
    }

    // Tutup modal saat tombol 'x' diklik
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            uploadModal.style.display = 'none';
        });
    }

    // Tutup modal jika pengguna mengklik di luar area konten modal
    window.addEventListener('click', (event) => {
        if (event.target == uploadModal) {
            uploadModal.style.display = 'none';
        }
    });

    // --- Image Preview ---
    // Tampilkan pratinjau gambar saat pengguna memilih file
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
                previewLabel.style.display = 'none'; // Sembunyikan label "Pilih Gambar"
            };
            reader.readAsDataURL(file);
        }
    });

    /**
     * Mengambil daftar kategori dari database dan mengisinya ke dalam dropdown select.
     */
    async function loadCategories() {
        const { data, error } = await supabase.from('categories').select('id, name');
        if (error) {
            console.error('Error fetching categories:', error.message);
            return;
        }
        // Reset dropdown dan isi dengan kategori yang diambil
        categorySelect.innerHTML = '<option value="">Pilih Kategori (Opsional)</option>';
        data.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    // --- Form Submission ---
    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        setLoading(true); // Tampilkan spinner dan nonaktifkan tombol
        errorDiv.style.display = 'none'; // Sembunyikan pesan error sebelumnya

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showError('Anda harus login untuk mengunggah stiker.');
            setLoading(false);
            return;
        }

        const file = fileInput.files[0];
        const title = document.getElementById('sticker-title').value;
        // Ubah string tags menjadi array, hapus spasi, dan filter nilai kosong
        const tags = document.getElementById('sticker-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        const categoryId = categorySelect.value || null;

        if (!file) {
            showError('Silakan pilih file gambar.');
            setLoading(false);
            return;
        }

        try {
            // Langkah 1: Unggah gambar ke Supabase Storage
            const filePath = `public/${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('stickers')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Langkah 2: Dapatkan URL publik dari gambar yang baru diunggah
            const { data: { publicUrl } } = supabase.storage
                .from('stickers')
                .getPublicUrl(filePath);

            if (!publicUrl) throw new Error("Tidak bisa mendapatkan URL publik untuk gambar.");

            // Langkah 3: Masukkan metadata stiker ke dalam tabel 'stickers' di database
            const { error: insertError } = await supabase
                .from('stickers')
                .insert({
                    user_id: user.id,
                    title: title,
                    image_url: publicUrl,
                    tags: tags,
                    category_id: categoryId
                });

            if (insertError) throw insertError;

            // Langkah 4: Sukses! Tutup modal, reset form, dan muat ulang halaman untuk menampilkan stiker baru.
            uploadModal.style.display = 'none';
            uploadForm.reset();
            previewImg.style.display = 'none';
            previewLabel.style.display = 'block';

            window.location.reload();

        } catch (error) {
            showError(`Gagal mengunggah: ${error.message}`);
        } finally {
            setLoading(false); // Sembunyikan spinner dan aktifkan kembali tombol
        }
    });

    /**
     * Mengatur status loading pada tombol submit.
     * @param {boolean} isLoading - True untuk menampilkan spinner, false untuk menampilkan teks.
     */
    function setLoading(isLoading) {
        const buttonText = submitButton.querySelector('.button-text');
        const spinner = submitButton.querySelector('.spinner');
        if (isLoading) {
            submitButton.disabled = true;
            buttonText.style.display = 'none';
            spinner.style.display = 'inline-block';
        } else {
            submitButton.disabled = false;
            buttonText.style.display = 'inline-block';
            spinner.style.display = 'none';
        }
    }

    /**
     * Menampilkan pesan error di dalam modal.
     * @param {string} message - Pesan error yang akan ditampilkan.
     */
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
});
