async function loadFeaturedProducts() {
    const { data } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);
    
    // Filter products with stock OR unlimited inventory
    const products = (data || []).filter(p => 
        p.stock > 0 || p.track_inventory === false
    );
    
    const grid = document.getElementById('featured-grid');
    
    if (!products || products.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">No products available</p>';
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
        const mainImage = images[0];
        const hasImage = mainImage && mainImage.trim() !== '';
        
        return `
            <a href="/product?id=${product.id}" class="product-card">
                <div class="product-image-container">
                    ${hasImage ? 
                        `<img src="${mainImage}" alt="${product.name}" class="product-image">` :
                        `<div class="product-image-placeholder">No Image</div>`
                    }
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">$${product.price.toFixed(2)}</p>
                </div>
            </a>
        `;
    }).join('');
}

loadFeaturedProducts();
