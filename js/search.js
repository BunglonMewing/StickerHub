// js/search.js

let isSearchActive = false;

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const query = document.getElementById('search-input').value.trim();

            if (query) {
                isSearchActive = true;
                window.removeEventListener('scroll', handleInfiniteScroll); // Nonaktifkan infinite scroll

                const stickerContainer = document.getElementById('sticker-container');
                stickerContainer.innerHTML = '<p style="text-align:center; color: var(--c-dark-gray);">Mencari...</p>';

                const stickers = await searchStickers(query);

                stickerContainer.innerHTML = ''; // Hapus pesan "Mencari..."
                if (stickers.length > 0) {
                    renderStickers(stickers); // Gunakan fungsi render dari main.js
                } else {
                    stickerContainer.innerHTML = `<p style="text-align:center; color: var(--c-dark-gray);">Tidak ada hasil untuk "${query}".</p>`;
                }
                showClearSearchButton();
            }
        });
    }
});

async function searchStickers(query) {
    // Mencari di judul DAN di dalam array tags
    // format pencarian tag: '{"tag1","tag2"}'
    const tagsQuery = `{${query.split(' ').join(',')}}`;

    const { data, error } = await supabase
        .from('stickers_with_counts') // Menggunakan VIEW baru
        .select('*')
        .or(`title.ilike.%${query}%,tags.cs.{${query}}`); // cs = contains, ilike = case-insensitive LIKE

    if (error) {
        console.error('Error searching stickers:', error.message);
        return [];
    }
    return data;
}

function showClearSearchButton() {
    const feedHeader = document.querySelector('.feed-header');
    let clearButton = document.getElementById('clear-search-btn');
    if (!clearButton) {
        clearButton = document.createElement('button');
        clearButton.id = 'clear-search-btn';
        clearButton.textContent = 'Hapus Pencarian';
        clearButton.style.marginLeft = '20px';
        clearButton.style.padding = '5px 10px';
        clearButton.style.border = 'none';
        clearButton.style.borderRadius = '99px';
        clearButton.style.backgroundColor = 'var(--primary-color)';
        clearButton.style.color = 'white';
        clearButton.style.cursor = 'pointer';

        clearButton.addEventListener('click', () => {
            window.location.reload(); // Cara termudah untuk reset
        });

        feedHeader.appendChild(clearButton);
    }
}
