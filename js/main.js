// js/main.js

// --- State Management for Infinite Scroll ---
let currentPage = 0; // Melacak halaman stiker yang saat ini dimuat
const stickersPerPage = 10; // Jumlah stiker yang dimuat per permintaan
let isLoading = false; // Flag untuk mencegah beberapa permintaan fetch berjalan bersamaan
let allStickersLoaded = false; // Flag untuk menghentikan permintaan jika semua stiker sudah dimuat

// --- Event Listener Utama ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Lindungi halaman: Pastikan pengguna sudah login sebelum menampilkan konten.
    await protectPage();

    // 2. Dapatkan data pengguna yang sedang login
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // Perbarui UI untuk menampilkan status login (misalnya, email dan tombol logout)
        updateUIForAuthState(user);
    }

    // 3. Muat stiker awal saat halaman pertama kali dibuka
    await loadStickers();

    // 4. Muat stiker yang sedang tren di sidebar kanan
    fetchAndDisplayTrending();

    // 5. Tambahkan event listener untuk tombol logout
    const logoutButton = document.querySelector('#logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            signOutUser();
        });
    }

    // 6. Tambahkan event listener untuk fungsionalitas infinite scroll
    window.addEventListener('scroll', handleInfiniteScroll);
});

/**
 * Memperbarui elemen UI berdasarkan status autentikasi pengguna.
 * @param {object|null} user - Objek pengguna dari Supabase, atau null jika tidak login.
 */
function updateUIForAuthState(user) {
    const userProfileDiv = document.querySelector('.user-profile');
    const userEmailSpan = document.querySelector('#user-email');
    const uploadButton = document.querySelector('.tweet-button');

    if (user) {
        // Jika pengguna login, tampilkan profil dan tombol unggah
        if (userProfileDiv) userProfileDiv.style.display = 'flex';
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (uploadButton) uploadButton.style.display = 'block';
    } else {
        // Jika tidak, sembunyikan
        if (userProfileDiv) userProfileDiv.style.display = 'none';
        if (uploadButton) uploadButton.style.display = 'none';
    }
}

/**
 * Mengambil satu halaman stiker dari database (melalui view `stickers_with_counts`).
 * @param {number} page - Nomor halaman yang akan diambil.
 * @param {number} limit - Jumlah stiker per halaman.
 * @returns {Promise<Array>} - Sebuah array objek stiker.
 */
async function fetchStickers(page, limit) {
    const from = page * limit;
    const to = from + limit - 1;

    // Menggunakan view `stickers_with_counts` untuk mendapatkan data stiker beserta jumlah like/komentar
    const { data, error } = await supabase
        .from('stickers_with_counts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching stickers:', error.message);
        return [];
    }
    return data;
}

/**
 * Merender array stiker ke dalam kontainer di DOM.
 * @param {Array} stickers - Array objek stiker yang akan dirender.
 */
function renderStickers(stickers) {
    const container = document.getElementById('sticker-container');
    if (!container) return;

    // Tampilkan pesan jika tidak ada stiker sama sekali
    if (stickers.length === 0 && currentPage === 0) {
        container.innerHTML = '<p style="text-align:center; color: var(--c-dark-gray);">Belum ada stiker. Jadilah yang pertama mengunggah!</p>';
        return;
    }

    // Buat dan tambahkan kartu untuk setiap stiker
    stickers.forEach(sticker => {
        const creatorUsername = sticker.creator_username || 'anonim';
        const card = document.createElement('div');
        card.className = 'sticker-card';
        card.setAttribute('data-sticker-id', sticker.id);

        card.innerHTML = `
            <img src="${sticker.image_url}" alt="${sticker.title}">
            <div class="sticker-info-wrapper">
                <div class="sticker-info">
                    <h3>${sticker.title}</h3>
                    <p>oleh @${creatorUsername}</p>
                </div>
                <div class="sticker-actions">
                    <button class="action-btn comment-btn"><i class="far fa-comment"></i> <span>${sticker.comment_count}</span></button>
                    <button class="action-btn like-btn"><i class="far fa-heart"></i> <span>${sticker.like_count}</span></button>
                    <button class="action-btn favorite-btn"><i class="far fa-bookmark"></i></button>
                    <button class="action-btn download-btn"><i class="fas fa-download"></i></button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

/**
 * Wrapper function untuk mengelola state loading dan memuat halaman stiker berikutnya.
 */
async function loadStickers() {
    if (isLoading || allStickersLoaded) return; // Hentikan jika sedang loading atau semua data sudah dimuat
    isLoading = true;

    const stickers = await fetchStickers(currentPage, stickersPerPage);

    if (stickers.length > 0) {
        renderStickers(stickers);
        currentPage++; // Siap untuk halaman berikutnya
    } else {
        allStickersLoaded = true; // Tandai bahwa semua stiker telah dimuat
        const container = document.getElementById('sticker-container');
        if (container && container.children.length > 0) {
             container.insertAdjacentHTML('beforeend', '<p style="text-align:center; color: var(--c-dark-gray); margin-top: 20px;">Anda telah mencapai akhir.</p>');
        }
    }

    isLoading = false; // Selesai loading
}

/**
 * Handler untuk event scroll, memicu pemuatan stiker baru jika pengguna mencapai bagian bawah halaman.
 */
function handleInfiniteScroll() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        loadStickers();
    }
}

/**
 * Mengambil dan menampilkan stiker yang sedang tren dari RPC Supabase.
 */
async function fetchAndDisplayTrending() {
    const container = document.getElementById('trending-stickers-container');
    if (!container) return;

    // Memanggil fungsi `get_trending_stickers` di database
    const { data, error } = await supabase.rpc('get_trending_stickers');

    if (error) {
        console.error('Error fetching trending stickers:', error.message);
        container.innerHTML += '<p>Gagal memuat trending.</p>';
        return;
    }

    if (data.length === 0) {
        container.innerHTML += '<p>Belum ada yang tren saat ini.</p>';
        return;
    }

    // Render setiap item trending
    data.forEach(sticker => {
        const trendingItem = document.createElement('div');
        trendingItem.className = 'trending-item';
        trendingItem.innerHTML = `
            <p>${sticker.title}</p>
            <span>${sticker.like_count} Likes</span>
        `;
        container.appendChild(trendingItem);
    });
}
