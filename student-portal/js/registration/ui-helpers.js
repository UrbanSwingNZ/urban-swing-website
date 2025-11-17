/**
 * ui-helpers.js - UI Helper Functions
 * Handles UI updates, messages, and user feedback
 */

/**
 * Show loading spinner
 */
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    const submitBtn = document.getElementById('submit-btn');
    
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
    
    if (submitBtn) {
        submitBtn.disabled = show;
    }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        const span = successDiv.querySelector('span');
        if (span) {
            span.textContent = message;
        }
        successDiv.style.display = 'flex';
    }
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Scroll to error message
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Hide all messages
 */
function hideMessages() {
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    
    if (successDiv) successDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
}

/**
 * Initialize accordion functionality
 */
function initializeAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const section = this.closest('.accordion-section');
            section.classList.toggle('collapsed');
        });
    });
}

/**
 * Show snackbar notification
 */
function showSnackbar(message, type = 'success', duration = 3000) {
    // Remove any existing snackbar
    const existingSnackbar = document.getElementById('snackbar');
    if (existingSnackbar) {
        existingSnackbar.remove();
    }
    
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.id = 'snackbar';
    snackbar.className = `snackbar snackbar-${type}`;
    
    // Add icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'info') icon = 'fa-info-circle';
    
    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;
    
    // Add to body
    document.body.appendChild(snackbar);
    
    // Trigger animation
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);
    
    // Auto-hide after duration
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => {
            snackbar.remove();
        }, 300);
    }, duration);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
