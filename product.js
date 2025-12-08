const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

if (!productId) {
    window.location.href = '/products';
}

let product = null;
let allCategories = [];
let allTags = [];
let currentImageIndex = 0;

async function loadProduct() {
    const [productResult, categoriesResult, tagsResult] = await Promise.all([
        supabase.from('products').select('*').eq('id', productId).single(),
        supabase.from('categories').select('*'),
        supabase.from('tags').select('*')
    ]);
    
    if (productResult.error || !productResult.data) {
        window.location.href = '/products';
        return;
    }
    
    product = productResult.data;
    allCategories = categoriesResult.data || [];
    allTags = tagsResult.data || [];
    
    displayProduct();
}

function displayProduct() {
    // SEO
    document.getElementById('page-title').textContent = product.seo_title || product.name;
    document.getElementById('page-description').content = product.seo_description || product.description.substring(0, 160);
    document.getElementById('page-keywords').content = product.seo_keywords || '';
    
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    
    // Get categories
    const categoryNames = product.category_ids 
        ? product.category_ids.map(id => {
            const cat = allCategories.find(c => c.id === id);
            return cat ? cat.name : '';
        }).filter(Boolean)
        : [];
    
    // Get tags
    const tagNames = product.tag_ids 
        ? product.tag_ids.map(id => {
            const tag = allTags.find(t => t.id === id);
            return tag ? tag.name : '';
        }).filter(Boolean)
        : [];
    
    // Get features
    const features = product.features ? product.features.split('\n').filter(f => f.trim()) : [];
    
    const outOfStock = product.stock <= 0;
    
    document.getElementById('product-detail').innerHTML = `
        <div class="product-gallery">
            <div class="main-image">
                <img src="${images[currentImageIndex]}" alt="${product.name}" id="main-product-image">
            </div>
            ${images.length > 1 ? `
                <div class="image-thumbnails">
                    ${images.map((img, i) => `
                        <img src="${img}" 
                             class="thumbnail ${i === 0 ? 'active' : ''}" 
                             onclick="changeImage(${i})"
                             alt="View ${i + 1}">
                    `).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="product-details">
            <h1>${product.name}</h1>
            
            ${categoryNames.length > 0 ? `
                <div class="product-meta-categories">
                    ${categoryNames.map(c => `<span class="cat-badge">${c}</span>`).join('')}
                </div>
            ` : ''}
            
            <div class="product-price-large">$${product.price.toFixed(2)}</div>
            
            <div class="product-stock-info">
                ${outOfStock ? '<span class="out-of-stock-badge">Temporarily Unavailable</span>' : '<span class="in-stock-badge">In Stock</span>'}
            </div>
            
            <p class="product-description-full">${product.description}</p>
            
            ${features.length > 0 ? `
                <div class="product-features">
                    <h3>Features</h3>
                    <ul>
                        ${features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            ${tagNames.length > 0 ? `
                <div class="product-tags-section">
                    <strong>Tags:</strong>
                    ${tagNames.map(t => `<span class="tag-badge">${t}</span>`).join('')}
                </div>
            ` : ''}
            
            ${!outOfStock ? `<button class="btn btn-primary btn-large" onclick="checkout()">Purchase Now</button>` : ''}
        </div>
    `;
}

function changeImage(index) {
    currentImageIndex = index;
    const images = product.images && product.images.length > 0 ? product.images : [product.image_url];
    document.getElementById('main-product-image').src = images[index];
    
    document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

async function checkout() {
    if (!product || !stripe) return;
    
    try {
        const response = await fetch('/.netlify/functions/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                productId: product.id,
                productName: product.name,
                productPrice: product.price,
                productImage: product.images && product.images.length > 0 ? product.images[0] : product.image_url
            })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        await stripe.redirectToCheckout({ sessionId: data.sessionId });
        
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error processing checkout. Please contact us.');
    }
}

loadProduct();
