/**
 * ui-helpers.js - UI Helper Functions
 * Handles UI updates, messages, and user feedback
 */

// Import centralized utilities
import { escapeHtml, showSnackbar } from '/js/utils/index.js';

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



// Make functions available globally for backward compatibility
// (other non-module scripts depend on these)
window.showLoadingSpinner = showLoadingSpinner;
window.showSuccessMessage = showSuccessMessage;
window.showErrorMessage = showErrorMessage;
window.hideMessages = hideMessages;
window.initializeAccordions = initializeAccordions;
window.showSnackbar = showSnackbar;
