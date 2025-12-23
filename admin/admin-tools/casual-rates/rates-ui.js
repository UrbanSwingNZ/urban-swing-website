/**
 * Casual Rates UI Module
 * Main entry point for casual rates display and management
 */

import { displayCasualRates } from './rates-display.js';
import { openRateModal, closeRateModal, saveCasualRate } from './rates-actions.js';

/**
 * Initialize casual rates functionality
 * Sets up event listeners and loads rates
 */
function initCasualRates() {
    // Setup modal close button listener
    const closeBtn = document.querySelector('#rate-modal .modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeRateModal);
    }
    
    // Setup modal form listener
    const form = document.getElementById('rate-form');
    if (form) {
        form.addEventListener('submit', saveCasualRate);
    }
    
    // Setup add rate button
    const addBtn = document.getElementById('add-rate-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => openRateModal());
    }
    
    // Close modal on background click
    const modal = document.getElementById('rate-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeRateModal();
            }
        });
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCasualRates);
} else {
    initCasualRates();
}

// Expose functions globally for compatibility
window.loadCasualRates = displayCasualRates;
window.openRateModal = openRateModal;
window.closeRateModal = closeRateModal;
window.saveCasualRate = saveCasualRate;
