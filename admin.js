let currentUser = null;
let allCategories = [];
let allTags = [];
let allProducts = [];
let cropper = null;
let currentImageFile = null;
let productImages = [];

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
        document.getElementById('login-error').textContent = 'Invalid credentials';
        document.getElementById('login-error').classList.add('show');
    }
});

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

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        if (tab === 'categories') loadCategoriesTable();
        if (tab === 'tags') loadTagsTable();
    });
});

// IMAGE CROPPER
document.getElementById('image-upload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    currentImageFile = file;
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
    if (cropper) {
        cropper.setAspectRatio(ratio === 'free' ? NaN : ratio);
    }
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
    preview.innerHTML = productImages.map((url, index) => `
        <div class="image-preview-item">
            <img src="${url}">
            <button type="button" class="remove-image" onclick="removeProductImage(${index})">×</button>
            ${index === 0 ? '<span class="main-badge">Main</span>' : ''}
        </div>
    `).join('');
}

function removeProductImage(index) {
    productImages.splice(index, 1);
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
    document.getElementById('category-modal-title').textContent = 'Edit';
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

// TAGS
async function loadTags() {
    const { data } = await supabase.from('tags').select('*').order('name');
    allTags = data || [];
}

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
    document.getElementById('tag-modal-title').textContent = 'Edit';
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

async function quickAddTag() {
    const name = document.getElementById('new-tag').value.trim();
    if (!name) return;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
        const { data, error } = await supabase.from('tags').insert([{ name, slug }]).select();
        if (error) throw error;
        
        await loadTags();
        populateTagSelect();
        
        const select = document.getElementById('product-tags');
        Array.from(select.options).forEach(opt => {
            if (parseInt(opt.value) === data[0].id) opt.selected = true;
        });
        
        document.getElementById('new-tag').value = '';
    } catch (error) {
        alert('Error: ' + error.message);
    }
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
                    <td><span class="status-${p.status || 'active'}">${p.status || 'active'}</span></td>
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
    populateCategorySelect();
    populateTagSelect();
    
    document.getElementById('product-modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    productImages = [];
    displayProductImages();
    document.getElementById('product-modal').classList.add('active');
});

function populateCategorySelect() {
    document.getElementById('product-categories').innerHTML = 
        allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function populateTagSelect() {
    document.getElementById('product-tags').innerHTML = 
        allTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('product-name').value;
        
        const catSelect = document.getElementById('product-categories');
        const categoryIds = Array.from(catSelect.selectedOptions).map(o => parseInt(o.value));
        
        const tagSelect = document.getElementById('product-tags');
        const tagIds = Array.from(tagSelect.selectedOptions).map(o => parseInt(o.value));
        
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const productData = {
            name,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            status: document.getElementById('product-status').value,
            description: document.getElementById('product-description').value,
            features: document.getElementById('product-features').value,
            category_ids: categoryIds,
            tag_ids: tagIds,
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
        btn.textContent = 'Save';
    }
});

async function editProduct(id) {
    await loadCategories();
    await loadTags();
    
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if (!data) return;
    
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
    document.getElementById('seo-title').value = data.seo_title || '';
    document.getElementById('seo-description').value = data.seo_description || '';
    document.getElementById('seo-keywords').value = data.seo_keywords || '';
    
    if (data.category_ids) {
        const catSelect = document.getElementById('product-categories');
        Array.from(catSelect.options).forEach(opt => {
            opt.selected = data.category_ids.includes(parseInt(opt.value));
        });
    }
    
    if (data.tag_ids) {
        const tagSelect = document.getElementById('product-tags');
        Array.from(tagSelect.options).forEach(opt => {
            opt.selected = data.tag_ids.includes(parseInt(opt.value));
        });
    }
    
    productImages = data.images || [];
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
