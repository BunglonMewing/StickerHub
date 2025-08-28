// js/interactions.js

document.addEventListener('DOMContentLoaded', () => {
    const stickerContainer = document.getElementById('sticker-container');
    if (stickerContainer) {
        stickerContainer.addEventListener('click', handleStickerActions);
    }
});

async function handleStickerActions(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;

    const card = button.closest('.sticker-card');
    const stickerId = card.dataset.stickerId;

    if (button.classList.contains('like-btn')) {
        await toggleLike(stickerId, button);
    } else if (button.classList.contains('favorite-btn')) {
        await toggleFavorite(stickerId, button);
    } else if (button.classList.contains('download-btn')) {
        const imageUrl = card.querySelector('img').src;
        const title = card.querySelector('h3').textContent;
        await downloadSticker(imageUrl, title);
    }
}

async function downloadSticker(imageUrl, title) {
    try {
        // Fetch the image as a blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();

        // Create a temporary link to trigger the download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        // Suggest a filename
        const fileExtension = blob.type.split('/')[1] || 'png';
        link.download = `${title.replace(/ /g, '_')}.${fileExtension}`;

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error downloading sticker:', error);
        alert('Gagal mengunduh stiker.');
    }
}

async function toggleFavorite(stickerId, button) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Anda harus login untuk mem-favoritkan stiker.");
        return;
    }

    const { error: deleteError, count } = await supabase
        .from('favorites')
        .delete({ count: 'exact' })
        .match({ user_id: user.id, sticker_id: stickerId });

    if (deleteError) {
        console.error('Error unfavoriting sticker:', deleteError.message);
        return;
    }

    if (count > 0) {
        button.classList.remove('favorited');
    } else {
        const { error: insertError } = await supabase
            .from('favorites')
            .insert({ user_id: user.id, sticker_id: stickerId });

        if (insertError) {
            console.error('Error favoriting sticker:', insertError.message);
            return;
        }
        button.classList.add('favorited');
    }
}

async function toggleLike(stickerId, button) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert("Anda harus login untuk menyukai stiker.");
        window.location.href = '/login.html';
        return;
    }

    // Coba hapus like dulu (jika sudah ada)
    const { error: deleteError, count } = await supabase
        .from('likes')
        .delete({ count: 'exact' })
        .match({ user_id: user.id, sticker_id: stickerId });

    const likeCountSpan = button.querySelector('span');
    let currentLikes = parseInt(likeCountSpan.textContent, 10);

    if (deleteError) {
        console.error('Error unliking sticker:', deleteError.message);
        return;
    }

    if (count > 0) {
        // Berhasil unlike
        likeCountSpan.textContent = currentLikes - 1;
        button.classList.remove('liked');
    } else {
        // Jika tidak ada yang dihapus, berarti belum di-like. Coba like.
        const { error: insertError } = await supabase
            .from('likes')
            .insert({ user_id: user.id, sticker_id: stickerId });

        if (insertError) {
            console.error('Error liking sticker:', insertError.message);
            return;
        }
        // Berhasil like
        likeCountSpan.textContent = currentLikes + 1;
        button.classList.add('liked');
    }
}
