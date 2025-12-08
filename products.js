let allProducts = [];
let allCategories = [];
let allTags = [];
let currentFilter = 'all';

async function loadAll() {
    await Promise.all([
        loadCategories(),
        loadTags(),
        loadProducts()
    ]);
    
    createCategoryFilters();
    displayProducts();
}

async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    allCategories = data || [];
}

async function loadTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    allTags = data || [];
}

async function loadProducts() {
    const { data } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .gt('stock', 0)
        .order('created_at', { ascending: false });
    
    allProducts = data || [];
}

function createCategoryFilters() {
    const container = document.getElementById('category-filters');
    container.innerHTML = allCategories.map(cat => 
        `<button class="filter-btn" data-filter="${cat.id}">${cat.name}</button>`
    ).join('');
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            displayProducts();
        });
    });
}

function displayProducts() {
    let filtered = allProducts;
    
    if (currentFilter !== 'all') {
        filtered = allProducts.filter(p => 
            p.category_ids && p.category_ids.includes(parseInt(currentFilter))
        );
    }
    
    const grid = document.getElementById('products-grid');
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1 / -1;">No products found</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(product => {
        const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
        const mainImage = images[0];
        
        // Get category names
        const categoryNames = product.category_ids 
            ? product.category_ids.map(id => {
                const cat = allCategories.find(c => c.id === id);
                return cat ? cat.name : '';
            }).filter(Boolean)
            : [];
        
        // Get tag names
        const tagNames = product.tag_ids 
            ? product.tag_ids.map(id => {
                const tag = allTags.find(t => t.id === id);
                return tag ? tag.name : '';
            }).filter(Boolean)
            : [];
        
        return `
            <a href="product.html?id=${product.id}" class="product-card">
                <div class="product-image-container" ${images.length > 1 ? `data-images='${JSON.stringify(images)}'` : ''}>
                    <img src="${mainImage}" alt="${product.name}" class="product-image">
                    ${images.length > 1 ? '<div class="image-dots"></div>' : ''}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    ${categoryNames.length > 0 ? `<div class="product-categories">${categoryNames.map(c => `<span class="cat-badge">${c}</span>`).join('')}</div>` : ''}
                    <p class="product-description">${truncate(product.description, 80)}</p>
                    ${tagNames.length > 0 ? `<div class="product-tags">${tagNames.slice(0, 3).map(t => `<span class="tag-badge">${t}</span>`).join('')}</div>` : ''}
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                </div>
            </a>
        `;
    }).join('');
    
    // Add hover image slider
    setupImageSliders();
}

function setupImageSliders() {
    document.querySelectorAll('.product-image-container[data-images]').forEach(container => {
        const images = JSON.parse(container.dataset.images);
        if (images.length <= 1) return;
        
        const img = container.querySelector('.product-image');
        const dotsContainer = container.querySelector('.image-dots');
        let currentIndex = 0;
        
        // Create dots
        dotsContainer.innerHTML = images.map((_, i) => 
            `<span class="dot ${i === 0 ? 'active' : ''}"></span>`
        ).join('');
        
        const dots = dotsContainer.querySelectorAll('.dot');
        
        container.addEventListener('mouseenter', () => {
            container.interval = setInterval(() => {
                currentIndex = (currentIndex + 1) % images.length;
                img.src = images[currentIndex];
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }, 1000);
        });
        
        container.addEventListener('mouseleave', () => {
            if (container.interval) {
                clearInterval(container.interval);
                currentIndex = 0;
                img.src = images[0];
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === 0);
                });
            }
        });
    });
}

function truncate(text, length) {
    if (!text || text.length <= length) return text || '';
    return text.substring(0, length) + '...';
}

loadAll();
