let currentUser = null;
let allCategories = [];
let allTags = [];
let allProducts = [];
let uploadedImages = [];

// Auth check
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        currentUser = data.user;
        showDashboard();
    } catch (error) {
        errorDiv.textContent = 'Invalid credentials';
        errorDiv.classList.add('show');
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
});

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadAll();
}

async function loadAll() {
    await loadCategories();
    await loadTags();
    await loadProductsTable();
}

// ========== TABS ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        if (tab === 'products') loadProductsTable();
        if (tab === 'categories') loadCategoriesTable();
        if (tab === 'tags') loadTagsTable();
    });
});

// ========== CATEGORIES ==========
async function loadCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) console.error(error);
    allCategories = data || [];
}

async function loadCategoriesTable() {
    await loadCategories();
    const table = document.getElementById('categories-table');
    
    if (allCategories.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No categories yet</p>';
        return;
    }
    
    table.innerHTML = `<table>
        <thead><tr><th>Name</th><th>Slug</th><th>Actions</th></tr></thead>
        <tbody>
            ${allCategories.map(cat => `<tr>
                <td><strong>${cat.name}</strong></td>
                <td>${cat.slug}</td>
                <td>
                    <button class="edit-btn" onclick="editCategory(${cat.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteCategory(${cat.id})">Delete</button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
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
        alert(id ? 'Updated!' : 'Added!');
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
    if (!confirm('Delete this category?')) return;
    await supabase.from('categories').delete().eq('id', id);
    loadCategories();
    loadCategoriesTable();
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('active');
}

// ========== TAGS ==========
async function loadTags() {
    const { data, error } = await supabase.from('tags').select('*').order('name');
    if (error) console.error(error);
    allTags = data || [];
}

async function loadTagsTable() {
    await loadTags();
    const table = document.getElementById('tags-table');
    
    if (allTags.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No tags yet</p>';
        return;
    }
    
    table.innerHTML = `<table>
        <thead><tr><th>Name</th><th>Slug</th><th>Actions</th></tr></thead>
        <tbody>
            ${allTags.map(tag => `<tr>
                <td><strong>${tag.name}</strong></td>
                <td>${tag.slug}</td>
                <td>
                    <button class="edit-btn" onclick="editTag(${tag.id})">Edit</button>
                    <button class="delete-btn" onclick="deleteTag(${tag.id})">Delete</button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
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
        alert(id ? 'Updated!' : 'Added!');
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
    if (!confirm('Delete this tag?')) return;
    await supabase.from('tags').delete().eq('id', id);
    loadTags();
    loadTagsTable();
}

function closeTagModal() {
    document.getElementById('tag-modal').classList.remove('active');
}

// Quick add tag from product form
async function quickAddTag() {
    const name = document.getElementById('new-tag-name').value.trim();
    if (!name) return;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
        const { data, error } = await supabase.from('tags').insert([{ name, slug }]).select();
        if (error) throw error;
        
        await loadTags();
        populateTagSelect();
        
        // Auto-select the new tag
        const newTag = data[0];
        const select = document.getElementById('product-tags');
        Array.from(select.options).forEach(opt => {
            if (parseInt(opt.value) === newTag.id) opt.selected = true;
        });
        
        document.getElementById('new-tag-name').value = '';
        alert('Tag added!');
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ========== PRODUCTS ==========
async function loadProductsTable() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error(error);
        return;
    }
    
    allProducts = data || [];
    displayProducts();
}

function displayProducts() {
    const search = document.getElementById('product-search')?.value.toLowerCase() || '';
    const status = document.getElementById('status-filter')?.value || 'all';
    
    let filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search) || 
                            (p.description && p.description.toLowerCase().includes(search));
        const matchesStatus = status === 'all' || p.status === status;
        return matchesSearch && matchesStatus;
    });
    
    const table = document.getElementById('products-table');
    
    if (filtered.length === 0) {
        table.innerHTML = '<p style="padding: 3rem; text-align: center;">No products found</p>';
        return;
    }
    
    table.innerHTML = `<table>
        <thead>
            <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${filtered.map(p => {
                const mainImage = p.images && p.images.length > 0 ? p.images[0] : p.image_url;
                return `<tr>
                    <td><img src="${mainImage}" alt="${p.name}"></td>
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
    </table>`;
}

// Search and filter
document.getElementById('product-search')?.addEventListener('input', displayProducts);
document.getElementById('status-filter')?.addEventListener('change', displayProducts);

// Add product
document.getElementById('add-product-btn').addEventListener('click', async () => {
    await loadCategories();
    await loadTags();
    populateCategorySelect();
    populateTagSelect();
    
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('images-preview').innerHTML = '';
    uploadedImages = [];
    document.getElementById('product-modal').classList.add('active');
});

function populateCategorySelect() {
    const select = document.getElementById('product-categories');
    select.innerHTML = allCategories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
}

function populateTagSelect() {
    const select = document.getElementById('product-tags');
    select.innerHTML = allTags.map(tag => 
        `<option value="${tag.id}">${tag.name}</option>`
    ).join('');
}

// Image upload
document.getElementById('product-images-upload').addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('images-preview');
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${e.target.result}">
                <button type="button" class="remove-image" onclick="this.parentElement.remove()">×</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
});

async function uploadImages(files) {
    const urls = [];
    for (const file of files) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
        const { error } = await supabase.storage.from('product-images').upload(fileName, file);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        urls.push(publicUrl);
    }
    return urls;
}

// Save product
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const productId = document.getElementById('product-id').value;
        
        // Get images
        let imageUrls = [];
        const files = document.getElementById('product-images-upload').files;
        if (files.length > 0) {
            imageUrls = await uploadImages(Array.from(files));
        }
        
        const manualUrls = document.getElementById('product-image-urls').value
            .split('\n')
            .map(url => url.trim())
            .filter(url => url);
        
        imageUrls = [...imageUrls, ...manualUrls];
        
        if (imageUrls.length === 0 && !productId) {
            alert('Please add at least one image');
            btn.disabled = false;
            btn.textContent = 'Save Product';
            return;
        }
        
        // Get categories
        const catSelect = document.getElementById('product-categories');
        const categoryIds = Array.from(catSelect.selectedOptions).map(opt => parseInt(opt.value));
        
        // Get tags
        const tagSelect = document.getElementById('product-tags');
        const tagIds = Array.from(tagSelect.selectedOptions).map(opt => parseInt(opt.value));
        
        // Generate slug
        const name = document.getElementById('product-name').value;
        let slug = document.getElementById('product-slug').value.trim();
        if (!slug) {
            slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        }
        
        const productData = {
            name,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            status: document.getElementById('product-status').value,
            description: document.getElementById('product-description').value,
            features: document.getElementById('product-features').value,
            category_ids: categoryIds,
            tag_ids: tagIds,
            images: imageUrls,
            image_url: imageUrls[0] || null, // Keep for backwards compatibility
            seo_title: document.getElementById('product-seo-title').value || null,
            seo_description: document.getElementById('product-seo-description').value || null,
            seo_keywords: document.getElementById('product-seo-keywords').value || null,
            slug
        };
        
        if (productId) {
            await supabase.from('products').update(productData).eq('id', productId);
        } else {
            await supabase.from('products').insert([productData]);
        }
        
        closeProductModal();
        loadProductsTable();
        alert(productId ? 'Product updated!' : 'Product added!');
        
    } catch (error) {
        console.error(error);
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Product';
    }
});

async function editProduct(id) {
    await loadCategories();
    await loadTags();
    
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) {
        alert('Error loading product');
        return;
    }
    
    populateCategorySelect();
    populateTagSelect();
    
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = data.id;
    document.getElementById('product-name').value = data.name;
    document.getElementById('product-price').value = data.price;
    document.getElementById('product-stock').value = data.stock;
    document.getElementById('product-status').value = data.status || 'active';
    document.getElementById('product-description').value = data.description;
    document.getElementById('product-features').value = data.features || '';
    document.getElementById('product-seo-title').value = data.seo_title || '';
    document.getElementById('product-seo-description').value = data.seo_description || '';
    document.getElementById('product-seo-keywords').value = data.seo_keywords || '';
    document.getElementById('product-slug').value = data.slug || '';
    
    // Set categories
    if (data.category_ids) {
        const catSelect = document.getElementById('product-categories');
        Array.from(catSelect.options).forEach(opt => {
            opt.selected = data.category_ids.includes(parseInt(opt.value));
        });
    }
    
    // Set tags
    if (data.tag_ids) {
        const tagSelect = document.getElementById('product-tags');
        Array.from(tagSelect.options).forEach(opt => {
            opt.selected = data.tag_ids.includes(parseInt(opt.value));
        });
    }
    
    // Show images
    const preview = document.getElementById('images-preview');
    preview.innerHTML = '';
    if (data.images && data.images.length > 0) {
        data.images.forEach(url => {
            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${url}">
                <button type="button" class="remove-image" onclick="this.parentElement.remove()">×</button>
            `;
            preview.appendChild(div);
        });
    }
    
    document.getElementById('product-modal').classList.add('active');
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    loadProductsTable();
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}
