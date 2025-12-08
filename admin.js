let currentUser = null;
let allCategories = [];
let allTags = [];

// Check if user is logged in on page load
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        currentUser = session.user;
        showDashboard();
    }
});

// Handle login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        showDashboard();
        
    } catch (error) {
        errorDiv.textContent = 'Invalid credentials. Please try again.';
        errorDiv.classList.add('show');
    }
});

// Handle logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
});

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    loadCategories();
    loadTags();
    loadProductsTable();
}

// ============ TAB SWITCHING ============
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        // Load data for the tab
        if (tab === 'products') loadProductsTable();
        if (tab === 'categories') loadCategoriesTable();
        if (tab === 'tags') loadTagsTable();
    });
});

// ============ CATEGORIES ============
async function loadCategories() {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');
        
        if (error) throw error;
        allCategories = data || [];
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadCategoriesTable() {
    try {
        await loadCategories();
        const tableContainer = document.getElementById('categories-table');
        
        if (allCategories.length === 0) {
            tableContainer.innerHTML = '<p style="padding: 3rem; text-align: center;">No categories yet. Add your first category!</p>';
            return;
        }
        
        tableContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allCategories.map(cat => `
                        <tr>
                            <td><strong>${cat.name}</strong></td>
                            <td>${cat.slug}</td>
                            <td>
                                <button class="edit-btn" onclick="editCategory(${cat.id})">Edit</button>
                                <button class="delete-btn" onclick="deleteCategory(${cat.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading categories table:', error);
    }
}

document.getElementById('add-category-btn').addEventListener('click', () => {
    document.getElementById('category-modal-title').textContent = 'Add Category';
    document.getElementById('category-form').reset();
    document.getElementById('category-id').value = '';
    document.getElementById('category-modal').classList.add('active');
});

document.getElementById('category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const categoryId = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    try {
        if (categoryId) {
            const { error } = await supabase
                .from('categories')
                .update({ name, slug })
                .eq('id', categoryId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('categories')
                .insert([{ name, slug }]);
            if (error) throw error;
        }
        
        closeCategoryModal();
        loadCategories();
        loadCategoriesTable();
        alert(categoryId ? 'Category updated!' : 'Category added!');
    } catch (error) {
        console.error('Error saving category:', error);
        alert('Error: ' + error.message);
    }
});

async function editCategory(id) {
    const category = allCategories.find(c => c.id === id);
    if (!category) return;
    
    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('category-id').value = category.id;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-modal').classList.add('active');
}

async function deleteCategory(id) {
    if (!confirm('Delete this category? Products using it will need a new category.')) return;
    
    try {
        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        loadCategories();
        loadCategoriesTable();
        alert('Category deleted!');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error: ' + error.message);
    }
}

function closeCategoryModal() {
    document.getElementById('category-modal').classList.remove('active');
}

// ============ TAGS ============
async function loadTags() {
    try {
        const { data, error} = await supabase
            .from('tags')
            .select('*')
            .order('name');
        
        if (error) throw error;
        allTags = data || [];
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

async function loadTagsTable() {
    try {
        await loadTags();
        const tableContainer = document.getElementById('tags-table');
        
        if (allTags.length === 0) {
            tableContainer.innerHTML = '<p style="padding: 3rem; text-align: center;">No tags yet. Add your first tag!</p>';
            return;
        }
        
        tableContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allTags.map(tag => `
                        <tr>
                            <td><strong>${tag.name}</strong></td>
                            <td>${tag.slug}</td>
                            <td>
                                <button class="edit-btn" onclick="editTag(${tag.id})">Edit</button>
                                <button class="delete-btn" onclick="deleteTag(${tag.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading tags table:', error);
    }
}

document.getElementById('add-tag-btn').addEventListener('click', () => {
    document.getElementById('tag-modal-title').textContent = 'Add Tag';
    document.getElementById('tag-form').reset();
    document.getElementById('tag-id').value = '';
    document.getElementById('tag-modal').classList.add('active');
});

document.getElementById('tag-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tagId = document.getElementById('tag-id').value;
    const name = document.getElementById('tag-name').value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    try {
        if (tagId) {
            const { error } = await supabase
                .from('tags')
                .update({ name, slug })
                .eq('id', tagId);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('tags')
                .insert([{ name, slug }]);
            if (error) throw error;
        }
        
        closeTagModal();
        loadTags();
        loadTagsTable();
        alert(tagId ? 'Tag updated!' : 'Tag added!');
    } catch (error) {
        console.error('Error saving tag:', error);
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
    
    try {
        const { error } = await supabase
            .from('tags')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        loadTags();
        loadTagsTable();
        alert('Tag deleted!');
    } catch (error) {
        console.error('Error deleting tag:', error);
        alert('Error: ' + error.message);
    }
}

function closeTagModal() {
    document.getElementById('tag-modal').classList.remove('active');
}

// ============ PRODUCTS ============
async function loadProductsTable() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*, categories(name)')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const tableContainer = document.getElementById('products-table');
        
        if (!data || data.length === 0) {
            tableContainer.innerHTML = '<p style="padding: 3rem; text-align: center;">No products yet. Add your first product!</p>';
            return;
        }
        
        tableContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Category</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(product => `
                        <tr>
                            <td><img src="${product.image_url}" alt="${product.name}"></td>
                            <td><strong>${product.name}</strong></td>
                            <td>$${product.price.toFixed(2)}</td>
                            <td>${product.stock}</td>
                            <td>${product.categories ? product.categories.name : product.category || 'N/A'}</td>
                            <td>
                                <button class="edit-btn" onclick="editProduct(${product.id})">Edit</button>
                                <button class="delete-btn" onclick="deleteProduct(${product.id})">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

document.getElementById('add-product-btn').addEventListener('click', async () => {
    await loadCategories();
    await loadTags();
    populateCategorySelect();
    populateTagSelect();
    
    document.getElementById('modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('upload-filename').textContent = 'No file chosen';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('product-form-modal').classList.add('active');
});

function populateCategorySelect() {
    const select = document.getElementById('product-category');
    select.innerHTML = '<option value="">Select category...</option>' +
        allCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function populateTagSelect() {
    const select = document.getElementById('product-tags');
    select.innerHTML = allTags.map(tag => `<option value="${tag.id}">${tag.name}</option>`).join('');
}

// Image upload handling
document.getElementById('product-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById('upload-filename').textContent = file.name;
    
    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('image-preview').innerHTML = 
            `<img src="${e.target.result}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">`;
    };
    reader.readAsDataURL(file);
});

async function uploadImage(file) {
    const fileName = `${Date.now()}-${file.name}`;
    
    const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
    
    return publicUrl;
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    try {
        const productId = document.getElementById('product-id').value;
        
        // Handle image upload
        let imageUrl = document.getElementById('product-image-url').value;
        const manualUrl = document.getElementById('product-image-url-manual').value;
        const imageFile = document.getElementById('product-image-file').files[0];
        
        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        } else if (manualUrl) {
            imageUrl = manualUrl;
        }
        
        if (!imageUrl) {
            alert('Please provide an image');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
            return;
        }
        
        // Get selected tags
        const tagSelect = document.getElementById('product-tags');
        const selectedTags = Array.from(tagSelect.selectedOptions).map(opt => parseInt(opt.value));
        
        const productData = {
            name: document.getElementById('product-name').value,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            category_id: parseInt(document.getElementById('product-category').value),
            tag_ids: selectedTags,
            description: document.getElementById('product-description').value,
            features: document.getElementById('product-features').value,
            image_url: imageUrl
        };
        
        if (productId) {
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId);
            
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('products')
                .insert([productData]);
            
            if (error) throw error;
        }
        
        closeProductModal();
        loadProductsTable();
        alert(productId ? 'Product updated!' : 'Product added!');
        
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Product';
    }
});

async function editProduct(productId) {
    try {
        await loadCategories();
        await loadTags();
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        populateCategorySelect();
        populateTagSelect();
        
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = data.id;
        document.getElementById('product-name').value = data.name;
        document.getElementById('product-price').value = data.price;
        document.getElementById('product-stock').value = data.stock;
        document.getElementById('product-category').value = data.category_id || '';
        document.getElementById('product-description').value = data.description;
        document.getElementById('product-features').value = data.features || '';
        document.getElementById('product-image-url').value = data.image_url;
        document.getElementById('product-image-url-manual').value = data.image_url;
        
        // Set selected tags
        if (data.tag_ids) {
            const tagSelect = document.getElementById('product-tags');
            Array.from(tagSelect.options).forEach(opt => {
                opt.selected = data.tag_ids.includes(parseInt(opt.value));
            });
        }
        
        // Show current image
        document.getElementById('image-preview').innerHTML = 
            `<img src="${data.image_url}" style="max-width: 200px; max-height: 200px; border-radius: 8px;">`;
        
        document.getElementById('product-form-modal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Error loading product');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) throw error;
        
        loadProductsTable();
        alert('Product deleted!');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error: ' + error.message);
    }
}

function closeProductModal() {
    document.getElementById('product-form-modal').classList.remove('active');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
        closeProductModal();
        closeCategoryModal();
        closeTagModal();
    });
});
