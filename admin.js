let currentUser = null;

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
    loadProductsTable();
}

// Load products table
async function loadProductsTable() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const tableContainer = document.getElementById('products-table');
        
        if (!data || data.length === 0) {
            tableContainer.innerHTML = '<p style="padding: 3rem; text-align: center; color: var(--text-light);">No products yet. Add your first product!</p>';
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
                            <td><span style="text-transform: capitalize;">${product.category}</span></td>
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

// Add product button
document.getElementById('add-product-btn').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-form-modal').classList.add('active');
});

// Close modal
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', closeProductModal);
});

document.querySelector('#product-form-modal .modal-overlay').addEventListener('click', closeProductModal);

function closeProductModal() {
    document.getElementById('product-form-modal').classList.remove('active');
}

// Handle product form submission
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        category: document.getElementById('product-category').value,
        description: document.getElementById('product-description').value,
        features: document.getElementById('product-features').value,
        image_url: document.getElementById('product-image').value
    };
    
    try {
        if (productId) {
            // Update existing product
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', productId);
            
            if (error) throw error;
        } else {
            // Create new product
            const { error } = await supabase
                .from('products')
                .insert([productData]);
            
            if (error) throw error;
        }
        
        closeProductModal();
        loadProductsTable();
        alert(productId ? 'Product updated successfully!' : 'Product added successfully!');
        
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Error saving product. Please try again.');
    }
});

// Edit product
async function editProduct(productId) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = data.id;
        document.getElementById('product-name').value = data.name;
        document.getElementById('product-price').value = data.price;
        document.getElementById('product-stock').value = data.stock;
        document.getElementById('product-category').value = data.category;
        document.getElementById('product-description').value = data.description;
        document.getElementById('product-features').value = data.features || '';
        document.getElementById('product-image').value = data.image_url;
        
        document.getElementById('product-form-modal').classList.add('active');
        
    } catch (error) {
        console.error('Error loading product:', error);
        alert('Error loading product details.');
    }
}

// Delete product
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
        
        if (error) throw error;
        
        loadProductsTable();
        alert('Product deleted successfully!');
        
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
    }
}
