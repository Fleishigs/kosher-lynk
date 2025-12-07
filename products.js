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
        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-light); grid-column: 1 / -1;">No products found.</p>';
        return;
    }

    grid.innerHTML = filtered.map(product => {
        const outOfStock = product.stock <= 0;
        return `
            <div class="product-card ${outOfStock ? 'out-of-stock' : ''}" onclick="openProductModal(${product.id})">
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${truncateText(product.description, 100)}</p>
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
        
        ${!outOfStock ? `<button class="btn-primary" onclick="checkoutProduct(${product.id})">Purchase</button>` : ''}
    `;

    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

// Close modal on close button or outside click
document.querySelector('.modal-close').addEventListener('click', closeProductModal);
document.getElementById('product-modal').addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') closeProductModal();
});

// Stripe Checkout
async function checkoutProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product || !stripe) return;

    try {
        // In production, this would call your backend to create a checkout session
        // For now, we'll show a simple implementation
        
        // You'll need to set up Stripe on your backend to create checkout sessions
        // This is a placeholder to show the structure
        
        alert('Checkout functionality requires backend setup. Please contact us at contact page to complete purchase.');
        
        // Backend endpoint would look like:
        // const response = await fetch('/create-checkout-session', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ productId: product.id })
        // });
        // const { sessionId } = await response.json();
        // await stripe.redirectToCheckout({ sessionId });
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please try again.');
    }
}

// Load products on page load
loadProducts();
