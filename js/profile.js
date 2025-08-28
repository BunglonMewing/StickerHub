// js/profile.js

document.addEventListener('DOMContentLoaded', async () => {
    // Pastikan pengguna login untuk melihat halaman ini
    const session = await getUserSession();
    if (!session) {
        window.location.replace('/login.html');
        return;
    }
    const currentUser = session.user;

    // Muat UI dasar (sidebar, dll)
    updateUIForAuthState(currentUser);
    const logoutButton = document.querySelector('#logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            signOutUser();
        });
    }

    // Ambil elemen tab
    const uploadedTab = document.getElementById('uploaded-tab');
    const favoritesTab = document.getElementById('favorites-tab');

    // Muat data profil dan stiker yang diunggah secara default
    loadProfileData(currentUser.id);
    loadStickersForTab('uploaded', currentUser.id);

    // Tambahkan event listener untuk tab
    uploadedTab.addEventListener('click', () => switchTab('uploaded', currentUser.id));
    favoritesTab.addEventListener('click', () => switchTab('favorites', currentUser.id));
});

async function loadProfileData(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error.message);
        document.getElementById('profile-username').textContent = 'Error';
    } else if (data) {
        document.getElementById('profile-username').textContent = data.username;
    }
}

function switchTab(tabName, userId) {
    // Update tampilan tombol tab
    document.querySelector('.tab-button.active').classList.remove('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Muat stiker yang sesuai
    loadStickersForTab(tabName, userId);
}

async function loadStickersForTab(tabName, userId) {
    const container = document.getElementById('profile-sticker-container');
    container.innerHTML = '<p style="text-align:center; color: var(--c-dark-gray);">Memuat stiker...</p>';

    let stickers = [];
    if (tabName === 'uploaded') {
        stickers = await fetchUploadedStickers(userId);
    } else {
        stickers = await fetchFavoritedStickers(userId);
    }

    container.innerHTML = '';
    if (stickers.length > 0) {
        renderProfileStickers(stickers, container);
    } else {
        container.innerHTML = `<p style="text-align:center; color: var(--c-dark-gray);">Tidak ada stiker untuk ditampilkan di sini.</p>`;
    }
}

async function fetchUploadedStickers(userId) {
    const { data, error } = await supabase
        .from('stickers_with_counts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching uploaded stickers:', error.message);
        return [];
    }
    return data;
}

async function fetchFavoritedStickers(userId) {
    // Pertama, dapatkan semua ID stiker yang difavoritkan
    const { data: favoriteIds, error: favError } = await supabase
        .from('favorites')
        .select('sticker_id')
        .eq('user_id', userId);

    if (favError) {
        console.error('Error fetching favorite IDs:', favError.message);
        return [];
    }
    if (favoriteIds.length === 0) return [];

    const stickerIds = favoriteIds.map(fav => fav.sticker_id);

    // Kedua, dapatkan detail stiker untuk ID tersebut
    const { data: stickers, error: stickerError } = await supabase
        .from('stickers_with_counts')
        .select('*')
        .in('id', stickerIds);

    if (stickerError) {
        console.error('Error fetching favorited stickers:', stickerError.message);
        return [];
    }
    return stickers;
}

// Fungsi render yang disalin dan disesuaikan untuk halaman profil
function renderProfileStickers(stickers, container) {
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

// Fungsi UI auth state yang disalin dari main.js untuk konsistensi
function updateUIForAuthState(user) {
    const userProfileDiv = document.querySelector('.user-profile');
    const userEmailSpan = document.querySelector('#user-email');
    const uploadButton = document.querySelector('.tweet-button');

    if (user) {
        if (userProfileDiv) userProfileDiv.style.display = 'flex';
        if (userEmailSpan) userEmailSpan.textContent = user.email;
        if (uploadButton) uploadButton.style.display = 'block';
    } else {
        if (userProfileDiv) userProfileDiv.style.display = 'none';
        if (uploadButton) uploadButton.style.display = 'none';
    }
}
