// Load featured products on homepage
async function loadFeaturedProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .gt('stock', 0)
            .order('created_at', { ascending: false })
            .limit(3);

        if (error) throw error;

        const grid = document.getElementById('featured-grid');
        if (!grid) return;

        if (data && data.length > 0) {
            grid.innerHTML = data.map(product => createProductCard(product)).join('');
        } else {
            grid.innerHTML = '<p style="text-align: center; color: var(--color-text-light);">No products available yet.</p>';
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function createProductCard(product) {
    return `
        <div class="product-card" onclick="window.location.href='products.html'">
            <img src="${product.image_url}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${truncateText(product.description, 100)}</p>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-stock">${product.stock} in stock</div>
            </div>
        </div>
    `;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Load products on page load
if (document.getElementById('featured-grid')) {
    loadFeaturedProducts();
}
