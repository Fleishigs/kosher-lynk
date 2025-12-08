// Contact form now uses Netlify Forms
// Submissions handled automatically and appear in Netlify dashboard

document.getElementById('contact-form').addEventListener('submit', (e) => {
    const statusDiv = document.getElementById('form-status');
    if (statusDiv) {
        statusDiv.textContent = 'Sending message...';
        statusDiv.style.display = 'block';
    }
});
