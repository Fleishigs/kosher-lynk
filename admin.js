let currentUser = null;
let allCategories = [];
let allTags = [];
let allProducts = [];
let allOrders = [];
let selectedCategoryIds = [];
let selectedTagIds = [];
let cropper = null;
let productImages = [];
let primaryImageIndex = 0;

// Mobile menu toggle
function toggleMobileMenu() {
    const sidebar = document.getElementById('admin-sidebar');
    sidebar.classList.toggle('mobile-open');
}

// Tab switching function
function switchTab(tabName) {
    document.querySelectorAll('.admin-menu-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Close mobile menu on tab switch
    const sidebar = document.getElementById('admin-sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
    
    if (tabName === 'dashboard') loadDashboard();
    if (tabName === 'categories') loadCategoriesTable();
    if (tabName === 'tags') loadTagsTable();
    if (tabName === 'orders') loadOrdersTable();
    if (tabName === 'products') loadProductsTable();
    if (tabName === 'customers') loadCustomersTable();
    if (tabName === 'settings') loadSettings();
}

// Auth
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        showDashboard();
    } catch (error) {
        document.getElementById('login-error').textContent = 'Invalid credentials: ' + error.message;
        document.getElementById('login-error').classList.add('show');
    }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'grid';
    loadAll();
}

async function loadAll() {
    await loadCategories();
    await loadTags();
    await loadProductsTable();
    await loadOrdersTable();
    await loadDashboard();
}

// ========== DASHBOARD ==========
async function loadDashboard() {
    try {
        // Load all data
        const [productsRes, ordersRes] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*')
        ]);
        
        const products = productsRes.data || [];
        const orders = ordersRes.data || [];
        
        // Calculate metrics
        const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
        const totalOrders = orders.length;
        const totalProducts = products.length;
        const inStockProducts = products.filter(p => p.stock > 0 || p.track_inventory === false).length;
        
        // Get unique customers
        const uniqueCustomers = new Set(orders.map(o => o.customer_email)).size;
        
        // This month stats
        const now = new Date();
        const thisMonthOrders = orders.filter(o => {
            const orderDate = new Date(o.created_at);
            return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        });
        const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
        
        // Update metrics
        document.getElementById('total-revenue').textContent = '$' + totalRevenue.toFixed(2);
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('total-products').textContent = totalProducts;
        document.getElementById('total-customers').textContent = uniqueCustomers;
        
        document.getElementById('orders-change').textContent = `${thisMonthOrders.length} this month`;
        document.getElementById('products-stock').textContent = `${inStockProducts} in stock`;
        
        // Update badge
        document.getElementById('orders-badge').textContent = totalOrders;
        
        // Revenue change (simple version)
        if (thisMonthRevenue > 0) {
            document.getElementById('revenue-change').textContent = `$${thisMonthRevenue.toFixed(2)} this month`;
        }
        
        // Recent orders
        displayRecentOrders(orders.slice(0, 5));
        
        // Low stock alerts
        displayLowStock(products.filter(p => p.stock > 0 && p.stock <= 5 && p.track_inventory !== false).slice(0, 5));
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayRecentOrders(orders) {
    const container = document.getElementById('recent-orders-list');
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="empty-state">No orders yet</p>';
        return;
    }
    
    container.innerHTML = orders.map(order => `
        <div class="list-item">
            <div class="list-item-content">
                <strong>${order.product_name}</strong>
                <small>${order.customer_name} • $${parseFloat(order.total_price).toFixed(2)}</small>
            </div>
            <div class="list-item-meta">
                <span class="status-badge status-${order.status}">${order.status}</span>
                <small>${new Date(order.created_at).toLocaleDateString()}</small>
            </div>
        </div>
    `).join('');
}

function displayLowStock(products) {
    const container = document.getElementById('low-stock-list');
    if (!products || products.length === 0) {
        container.innerHTML = '<p class="empty-state" style="color: var(--success);">✓ All products well stocked</p>';
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="list-item">
            <div class="list-item-content">
                <strong>${product.name}</strong>
                <small>Only ${product.stock} left in stock</small>
            </div>
            <button class="btn btn-sm btn-primary" onclick="editProduct(${product.id})">Restock</button>
        </div>
    `).join('');
}

document.getElementById('refresh-dashboard-btn')?.addEventListener('click', loadDashboard);

// Character counters for SEO
document.getElementById('seo-title')?.addEventListener('input', (e) => {
    document.getElementById('title-count').textContent = e.target.value.length;
});

document.getElementById('seo-description')?.addEventListener('input', (e) => {
    document.getElementById('desc-count').textContent = e.target.value.length;
});

// Tabs
document.querySelectorAll('.admin-menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchTab(tab);
    });
});

// IMAGE CROPPER
document.getElementById('image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('image-to-crop').src = e.target.result;
        document.getElementById('image-editor-modal').classList.add('active');
        
        if (cropper) cropper.destroy();
        cropper = new Cropper(document.getElementById('image-to-crop'), {
            viewMode: 1,
            aspectRatio: NaN,
            autoCropArea: 1,
            responsive: true,
            background: false
        });
    };
    reader.readAsDataURL(file);
});

function cropperRotate(deg) {
    if (cropper) cropper.rotate(deg);
}

function cropperFlip(dir) {
    if (!cropper) return;
    if (dir === 'h') cropper.scaleX(-(cropper.getData().scaleX || 1));
    if (dir === 'v') cropper.scaleY(-(cropper.getData().scaleY || 1));
}

function cropperReset() {
    if (cropper) cropper.reset();
}

function cropperSetAspect(ratio) {
    if (cropper) cropper.setAspectRatio(ratio === 'free' ? NaN : ratio);
}

async function saveCroppedImage() {
    if (!cropper) return;
    
    const canvas = cropper.getCroppedCanvas({
        maxWidth: 2000,
        maxHeight: 2000,
        imageSmoothingQuality: 'high'
    });
    
    canvas.toBlob(async (blob) => {
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        
        try {
            const { error } = await supabase.storage
                .from('product-images')
                .upload(fileName, blob, { contentType: 'image/jpeg' });
            
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);
            
            productImages.push(publicUrl);
            displayProductImages();
            closeImageEditor();
            document.getElementById('image-upload').value = '';
        } catch (error) {
            alert('Upload failed: ' + error.message);
        }
    }, 'image/jpeg', 0.9);
}

function displayProductImages() {
    const preview = document.getElementById('images-preview');
    if (productImages.length === 0) {
        preview.innerHTML = '<p style="color: var(--text-light);">No images yet.</p>';
        return;
    }
    
    preview.innerHTML = productImages.map((url, index) => `
        <div class="image-preview-item">
            <img src="${url}">
            <div class="image-actions">
                ${index !== primaryImageIndex ? 
                    `<button type="button" class="btn btn-sm btn-primary" onclick="setPrimaryImage(${index})">Set as Primary</button>` :
                    `<span class="primary-badge">PRIMARY</span>`
                }
                <button type="button" class="btn btn-sm btn-secondary" onclick="removeProductImage(${index})">Remove</button>
            </div>
        </div>
    `).join('');
}

function setPrimaryImage(index) {
    const temp = productImages[index];
    productImages.splice(index, 1);
    productImages.unshift(temp);
    primaryImageIndex = 0;
    displayProductImages();
}

function removeProductImage(index) {
    productImages.splice(index, 1);
    if (primaryImageIndex >= index && primaryImageIndex > 0) {
        primaryImageIndex--;
    }
    displayProductImages();
}

function closeImageEditor() {
    document.getElementById('image-editor-modal').classList.remove('active');
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

// CATEGORIES
async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    allCategories = data || [];
}

function populateCategorySelector() {
    const selector = document.getElementById('category-selector');
    const available = allCategories.filter(c => !selectedCategoryIds.includes(c.id));
    selector.innerHTML = available.map(c => 
        `<option value="${c.id}">${c.name}</option>`
    ).join('') || '<option disabled>All added</option>';
}

function displaySelectedCategories() {
    const container = document.getElementById('selected-categories');
    if (selectedCategoryIds.length === 0) {
        container.innerHTML = '<p class="empty-state">No categories selected</p>';
        return;
    }
    
    container.innerHTML = selectedCategoryIds.map(id => {
        const cat = allCategories.find(c => c.id === id);
        return cat ? `
            <div class="selected-item">
                <span>${cat.name}</span>
                <button type="button" class="remove-btn" onclick="removeCategory(${id})">×</button>
            </div>
        ` : '';
    }).join('');
}

function addCategory() {
    const selector = document.getElementById('category-selector');
    const selected = selector.value;
    if (!selected) return;
    
    const id = parseInt(selected);
    if (!selectedCategoryIds.includes(id)) {
        selectedCategoryIds.push(id);
        populateCategorySelector();
        displaySelectedCategories();
    }
}

function removeCategory(id) {
    selectedCategoryIds = selectedCategoryIds.filter(cid => cid !== id);
    populateCategorySelector();
    displaySelectedCategories();
}

// TAGS
async function loadTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    allTags = data || [];
}

function populateTagSelector() {
    const selector = document.getElementById('tag-selector');
    const available = allTags.filter(t => !selectedTagIds.includes(t.id));
    selector.innerHTML = available.map(t => 
        `<option value="${t.id}">${t.name}</option>`
    ).join('') || '<option disabled>All added</option>';
}

function displaySelectedTags() {
    const container = document.getElementById('selected-tags');
    if (selectedTagIds.length === 0) {
        container.innerHTML = '<p class="empty-state">No tags selected</p>';
        return;
    }
    
    container.innerHTML = selectedTagIds.map(id => {
        const tag = allTags.find(t => t.id === id);
        return tag ? `
            <div class="selected-item">
                <span>${tag.name}</span>
                <button type="button" class="remove-btn" onclick="removeTag(${id})">×</button>
            </div>
        ` : '';
    }).join('');
}

function addTag() {
    const selector = document.getElementById('tag-selector');
    const selected = selector.value;
    if (!selected) return;
    
    const id = parseInt(selected);
    if (!selectedTagIds.includes(id)) {
        selectedTagIds.push(id);
        populateTagSelector();
        displaySelectedTags();
    }
}

function removeTag(id) {
    selectedTagIds = selectedTagIds.filter(tid => tid !== id);
    populateTagSelector();
    displaySelectedTags();
}

async function quickAddTag() {
    const name = document.getElementById('new-tag-quick').value.trim();
    if (!name) return;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
        const { data, error } = await supabase.from('tags').insert([{ name, slug }]).select();
        if (error) throw error;
        
        await loadTags();
        selectedTagIds.push(data[0].id);
        populateTagSelector();
        displaySelectedTags();
        document.getElementById('new-tag-quick').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// CATEGORIES TABLE
async function loadCategoriesTable() {
    await loadCategories();
    const table = document.getElementById('categories-table');
    
    if (allCategories.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No categories</p>';
        return;
    }
    
    table.innerHTML = `<div class="products-table"><table>
        <thead><tr><th>Name</th><th>Slug</th><th>Actions</th></tr></thead>
        <tbody>
            ${allCategories.map(c => `<tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.slug}</td>
                <td>
                    <button class="edit-btn" onclick="editCategory(${c.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteCategory(${c.id})">Delete</button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table></div>`;
}

document.getElementById('add-category-btn').addEventListener('click', () => {
    document.getElementById('category-modal-title').textContent = 'Add Category';
    document.getElementById('category-form').reset();
    document.getElementById('category-id').value = '';
    document.getElementById('category-modal').classList.add('active');
});

document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    try {
        if (id) {
            await supabase.from('categories').update({ name, slug }).eq('id', id);
        } else {
            await supabase.from('categories').insert([{ name, slug }]);
        }
        closeCategoryModal();
        loadCategories();
        loadCategoriesTable();
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

async function editCategory(id) {
    const cat = allCategories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('category-id').value = cat.id;
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-modal').classList.add('active');
}

async function deleteCategory(id) {
    if (!confirm('Delete?')) return;
    await supabase.from('categories').delete().eq('id', id);
    loadCategories();
    loadCategoriesTable();
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('active');
}

// TAGS TABLE
async function loadTagsTable() {
    await loadTags();
    const table = document.getElementById('tags-table');
    
    if (allTags.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No tags</p>';
        return;
    }
    
    table.innerHTML = `<div class="products-table"><table>
        <thead><tr><th>Name</th><th>Slug</th><th>Actions</th></tr></thead>
        <tbody>
            ${allTags.map(t => `<tr>
                <td><strong>${t.name}</strong></td>
                <td>${t.slug}</td>
                <td>
                    <button class="edit-btn" onclick="editTag(${t.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteTag(${t.id})">Delete</button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table></div>`;
}

document.getElementById('add-tag-btn').addEventListener('click', () => {
    document.getElementById('tag-modal-title').textContent = 'Add Tag';
    document.getElementById('tag-form').reset();
    document.getElementById('tag-id').value = '';
    document.getElementById('tag-modal').classList.add('active');
});

document.getElementById('tag-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tag-id').value;
    const name = document.getElementById('tag-name').value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    try {
        if (id) {
            await supabase.from('tags').update({ name, slug }).eq('id', id);
        } else {
            await supabase.from('tags').insert([{ name, slug }]);
        }
        closeTagModal();
        loadTags();
        loadTagsTable();
    } catch (error) {
        alert('Error: ' + error.message);
    }
});

async function editTag(id) {
    const tag = allTags.find(t => t.id === id);
    if (!tag) return;
    document.getElementById('tag-modal-title').textContent = 'Edit Tag';
    document.getElementById('tag-id').value = tag.id;
    document.getElementById('tag-name').value = tag.name;
    document.getElementById('tag-modal').classList.add('active');
}

async function deleteTag(id) {
    if (!confirm('Delete?')) return;
    await supabase.from('tags').delete().eq('id', id);
    loadTags();
    loadTagsTable();
}

function closeTagModal() {
    document.getElementById('tag-modal').classList.remove('active');
}

// PRODUCTS
async function loadProductsTable() {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    allProducts = data || [];
    displayProducts();
}

function displayProducts() {
    const search = document.getElementById('product-search')?.value.toLowerCase() || '';
    const status = document.getElementById('status-filter')?.value || 'all';
    
    let filtered = allProducts.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search);
        const matchStatus = status === 'all' || p.status === status;
        return matchSearch && matchStatus;
    });
    
    const table = document.getElementById('products-table');
    
    if (filtered.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No products</p>';
        return;
    }
    
    table.innerHTML = `<div class="products-table"><table>
        <thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
            ${filtered.map(p => {
                const img = p.images && p.images.length > 0 ? p.images[0] : p.image_url;
                return `<tr>
                    <td><img src="${img}" alt="${p.name}"></td>
                    <td><strong>${p.name}</strong></td>
                    <td>$${p.price.toFixed(2)}</td>
                    <td>${p.stock}</td>
                    <td><span class="status-badge status-${p.status || 'active'}">${p.status || 'active'}</span></td>
                    <td>
                        <button class="edit-btn" onclick="editProduct(${p.id})">Edit</button>
                        <button class="delete-btn" onclick="deleteProduct(${p.id})">Delete</button>
                    </td>
                </tr>`;
            }).join('')}
        </tbody>
    </table></div>`;
}

document.getElementById('product-search')?.addEventListener('input', displayProducts);
document.getElementById('status-filter')?.addEventListener('change', displayProducts);

document.getElementById('add-product-btn').addEventListener('click', async () => {
    await loadCategories();
    await loadTags();
    
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    productImages = [];
    selectedCategoryIds = [];
    selectedTagIds = [];
    primaryImageIndex = 0;
    
    populateCategorySelector();
    populateTagSelector();
    displaySelectedCategories();
    displaySelectedTags();
    displayProductImages();
    
    document.getElementById('title-count').textContent = '0';
    document.getElementById('desc-count').textContent = '0';
    
    document.getElementById('product-modal').classList.add('active');
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value;
        const slug = document.getElementById('product-slug').value.trim() || 
                     name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const productData = {
            name,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            track_inventory: document.getElementById('track-inventory')?.checked ?? true,
            status: document.getElementById('product-status').value,
            description: document.getElementById('product-description').value,
            features: document.getElementById('product-features').value,
            category_ids: selectedCategoryIds,
            tag_ids: selectedTagIds,
            images: productImages,
            image_url: productImages[0] || null,
            seo_title: document.getElementById('seo-title').value || null,
            seo_description: document.getElementById('seo-description').value || null,
            seo_keywords: document.getElementById('seo-keywords').value || null,
            slug
        };
        
        if (id) {
            await supabase.from('products').update(productData).eq('id', id);
        } else {
            await supabase.from('products').insert([productData]);
        }
        
        closeProductModal();
        loadProductsTable();
        alert('Saved!');
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Product';
    }
});

async function editProduct(id) {
    await loadCategories();
    await loadTags();
    
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if (!data) return;
    
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = data.id;
    document.getElementById('product-name').value = data.name;
    document.getElementById('product-price').value = data.price;
    document.getElementById('product-stock').value = data.stock;
    if (document.getElementById('track-inventory')) {
        document.getElementById('track-inventory').checked = data.track_inventory !== false;
    }
    document.getElementById('product-status').value = data.status || 'active';
    document.getElementById('product-description').value = data.description;
    document.getElementById('product-features').value = data.features || '';
    document.getElementById('seo-title').value = data.seo_title || '';
    document.getElementById('seo-description').value = data.seo_description || '';
    document.getElementById('seo-keywords').value = data.seo_keywords || '';
    document.getElementById('product-slug').value = data.slug || '';
    
    document.getElementById('title-count').textContent = (data.seo_title || '').length;
    document.getElementById('desc-count').textContent = (data.seo_description || '').length;
    
    selectedCategoryIds = data.category_ids || [];
    selectedTagIds = data.tag_ids || [];
    productImages = data.images || [];
    primaryImageIndex = 0;
    
    populateCategorySelector();
    populateTagSelector();
    displaySelectedCategories();
    displaySelectedTags();
    displayProductImages();
    
    document.getElementById('product-modal').classList.add('active');
}

async function deleteProduct(id) {
    if (!confirm('Delete?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProductsTable();
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

// ========== ORDERS ==========
async function loadOrdersTable() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allOrders = data || [];
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-table').innerHTML = '<p style="padding: 3rem; text-align: center;">Error loading orders</p>';
    }
}

function displayOrders() {
    const search = document.getElementById('order-search')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('order-date-filter')?.value || 'all';
    
    let filtered = allOrders.filter(order => {
        const matchesSearch = 
            order.customer_email.toLowerCase().includes(search) ||
            order.customer_name.toLowerCase().includes(search) ||
            order.product_name.toLowerCase().includes(search);
        
        let matchesDate = true;
        if (dateFilter !== 'all') {
            const orderDate = new Date(order.created_at);
            const now = new Date();
            
            if (dateFilter === 'today') {
                matchesDate = orderDate.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = orderDate >= weekAgo;
            } else if (dateFilter === 'month') {
                matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            }
        }
        
        return matchesSearch && matchesDate;
    });
    
    const table = document.getElementById('orders-table');
    
    if (filtered.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No orders found</p>';
        return;
    }
    
    const totalRevenue = filtered.reduce((sum, order) => sum + parseFloat(order.total_price), 0);
    
    table.innerHTML = `
        <div class="orders-stats">
            <div class="stat-card">
                <div class="stat-value">${filtered.length}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
                <div class="stat-label">Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${(totalRevenue / filtered.length).toFixed(2)}</div>
                <div class="stat-label">Avg Order Value</div>
            </div>
        </div>
        <div class="products-table">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(order => `
                        <tr>
                            <td>${new Date(order.created_at).toLocaleDateString()}<br><small>${new Date(order.created_at).toLocaleTimeString()}</small></td>
                            <td>
                                <strong>${order.customer_name}</strong><br>
                                <small>${order.customer_email}</small>
                                ${order.customer_phone ? `<br><small>📞 ${order.customer_phone}</small>` : ''}
                            </td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 0.75rem;">
                                    ${order.product_image ? `<img src="${order.product_image}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px;">` : ''}
                                    <div>
                                        <strong>${order.product_name}</strong><br>
                                        <small>Qty: ${order.quantity}</small>
                                    </div>
                                </div>
                            </td>
                            <td><strong>$${parseFloat(order.total_price).toFixed(2)}</strong></td>
                            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                            <td><button class="btn btn-sm btn-secondary" onclick="viewOrderDetails(${order.id})">View</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const address = order.shipping_address || {};
    const addressText = address.line1 ? 
        `${address.name || order.shipping_name || order.customer_name}<br>${address.line1}${address.line2 ? ', ' + address.line2 : ''}<br>${address.city}, ${address.state} ${address.postal_code}<br>${address.country}` :
        'No address provided';
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            <h2>Order #${order.id}</h2>
            <div class="order-details">
                <div class="order-section">
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> ${order.customer_name}</p>
                    <p><strong>Email:</strong> ${order.customer_email}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone || 'Not provided'}</p>
                    <p><strong>Shipping To:</strong><br>${addressText}</p>
                </div>
                <div class="order-section">
                    <h3>Order Details</h3>
                    <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                    <p><strong>Product:</strong> ${order.product_name}</p>
                    <p><strong>Quantity:</strong> ${order.quantity}</p>
                    <p><strong>Total:</strong> $${parseFloat(order.total_price).toFixed(2)}</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                </div>
                <div class="order-section">
                    <h3>Payment Info</h3>
                    <p><strong>Stripe Session:</strong> <code>${order.stripe_session_id}</code></p>
                    <p><strong>Payment Intent:</strong> <code>${order.stripe_payment_intent || 'N/A'}</code></p>
                    ${order.stripe_customer_id ? `<p><strong>Customer ID:</strong> <code>${order.stripe_customer_id}</code></p>` : ''}
                </div>
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${order.stripe_payment_intent ? `<button class="btn btn-primary" onclick="window.open('https://dashboard.stripe.com/payments/${order.stripe_payment_intent}', '_blank')">View in Stripe</button>` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

document.getElementById('order-search')?.addEventListener('input', displayOrders);
document.getElementById('order-date-filter')?.addEventListener('change', displayOrders);

// ========== CUSTOMERS ==========
async function loadCustomersTable() {
    if (allOrders.length === 0) {
        await loadOrdersTable();
    }
    
    // Get unique customers with complete info
    const customersMap = new Map();
    allOrders.forEach(order => {
        if (!customersMap.has(order.customer_email)) {
            const address = order.shipping_address || {};
            const fullAddress = address.line1 ? 
                `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state} ${address.postal_code}, ${address.country}` :
                'No address on file';
            
            customersMap.set(order.customer_email, {
                name: order.customer_name,
                email: order.customer_email,
                phone: order.customer_phone || 'Not provided',
                address: fullAddress,
                totalOrders: 0,
                totalSpent: 0,
                lastOrder: order.created_at
            });
        }
        const customer = customersMap.get(order.customer_email);
        customer.totalOrders++;
        customer.totalSpent += parseFloat(order.total_price || 0);
        if (new Date(order.created_at) > new Date(customer.lastOrder)) {
            customer.lastOrder = order.created_at;
        }
    });
    
    const customers = Array.from(customersMap.values());
    
    const table = document.getElementById('customers-table');
    
    if (customers.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No customers yet</p>';
        return;
    }
    
    table.innerHTML = `<div class="products-table"><table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Shipping Address</th>
                <th>Orders</th>
                <th>Total Spent</th>
                <th>Last Order</th>
            </tr>
        </thead>
        <tbody>
            ${customers.map(c => `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td><a href="mailto:${c.email}" style="color: var(--primary);">${c.email}</a></td>
                    <td><a href="tel:${c.phone}" style="color: var(--primary);">${c.phone}</a></td>
                    <td style="max-width: 300px; line-height: 1.5;">${c.address}</td>
                    <td>${c.totalOrders}</td>
                    <td><strong>$${c.totalSpent.toFixed(2)}</strong></td>
                    <td>${new Date(c.lastOrder).toLocaleDateString()}</td>
                </tr>
            `).join('')}
        </tbody>
    </table></div>`;
}

// ========== SETTINGS ==========
function loadSettings() {
    document.getElementById('store-url').textContent = window.location.origin;
    document.getElementById('admin-email-display').textContent = currentUser?.email || '-';
}

// REFRESH BUTTONS
document.getElementById('refresh-products-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refresh-products-btn');
    btn.disabled = true;
    btn.textContent = '⟳ Refreshing...';
    await loadProductsTable();
    btn.disabled = false;
    btn.textContent = '🔄 Refresh';
});

document.getElementById('refresh-orders-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('refresh-orders-btn');
    btn.disabled = true;
    btn.textContent = '⟳ Refreshing...';
    await loadOrdersTable();
    btn.disabled = false;
    btn.textContent = '🔄 Refresh';
});
