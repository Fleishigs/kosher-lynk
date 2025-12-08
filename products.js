let allProducts = [];
let currentFilter = 'all';

// Load all products
async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allProducts = data || [];
        displayProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let filtered = allProducts;
    if (currentFilter !== 'all') {
        filtered = allProducts.filter(p => p.category === currentFilter);
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-light); grid-column: 1 / -1;">No products found.</p>';
        return;
    }

    grid.innerHTML = filtered.map(product => {
        const outOfStock = product.stock <= 0;
        return `
            <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" onclick="openProductModal(${product.id})">
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${truncateText(product.description, 80)}</p>
                    <div class="product-price">$${product.price.toFixed(2)}</div>
                    <div class="product-stock">${outOfStock ? 'Out of Stock' : `${product.stock} in stock`}</div>
                </div>
            </div>
        `;
    }).join('');
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Filter functionality
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        displayProducts();
    });
});

// Product Modal
function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const modalBody = document.getElementById('modal-body');

    const features = product.features ? product.features.split('\n').filter(f => f.trim()) : [];
    const outOfStock = product.stock <= 0;

    modalBody.innerHTML = `
        <img src="${product.image_url}" alt="${product.name}" class="modal-image">
        <h2>${product.name}</h2>
        <div class="modal-price">$${product.price.toFixed(2)}</div>
        <p class="modal-description">${product.description}</p>
        
        ${features.length > 0 ? `
            <div class="modal-features">
                <h3>Features</h3>
                <ul>
                    ${features.map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        
        <div class="product-stock">${outOfStock ? 'Out of Stock' : `${product.stock} available`}</div>
        
        ${!outOfStock ? `<button class="btn btn-primary btn-large" onclick="checkoutProduct(${product.id})">Purchase Now</button>` : ''}
    `;

    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

// Close modal handlers
document.querySelector('.modal-close').addEventListener('click', closeProductModal);
document.querySelector('.modal-overlay').addEventListener('click', closeProductModal);

// Stripe Checkout
async function checkoutProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product || !stripe) return;

    try {
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                productImage: product.image_url
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }

        await stripe.redirectToCheckout({ sessionId: data.sessionId });
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please try again or contact us.');
    }
}

// Load products on page load
loadProducts();
