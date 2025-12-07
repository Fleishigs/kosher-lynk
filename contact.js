// Handle contact form submission
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const statusDiv = document.getElementById('form-status');
    const originalBtnText = submitBtn.textContent;
    
    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    statusDiv.className = 'form-status';
    statusDiv.textContent = '';
    
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        message: document.getElementById('message').value,
        created_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabase
            .from('contact_submissions')
            .insert([formData]);
        
        if (error) throw error;
        
        // Success
        statusDiv.className = 'form-status success';
        statusDiv.textContent = 'Thank you! We\'ll get back to you soon.';
        e.target.reset();
        
    } catch (error) {
        console.error('Error submitting form:', error);
        statusDiv.className = 'form-status error';
        statusDiv.textContent = 'Sorry, there was an error. Please try again or email us directly.';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
});
