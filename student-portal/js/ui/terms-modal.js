/**
 * terms-modal.js - Terms and Conditions Modal Handler
 * Manages the display and interaction with the terms modal
 */

document.addEventListener('DOMContentLoaded', () => {
    const termsLink = document.getElementById('terms-link');
    const termsModal = document.getElementById('terms-modal');
    const termsCloseBtn = document.getElementById('terms-close-btn');
    const termsAcceptBtn = document.getElementById('terms-accept-btn');
    const termsCheckbox = document.getElementById('termsAccepted');
    
    // Open terms modal
    if (termsLink) {
        termsLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (termsModal) {
                termsModal.style.display = 'flex';
            }
        });
    }
    
    // Close modal with close button
    if (termsCloseBtn) {
        termsCloseBtn.addEventListener('click', () => {
            if (termsModal) {
                termsModal.style.display = 'none';
            }
        });
    }
    
    // Accept terms and close modal
    if (termsAcceptBtn) {
        termsAcceptBtn.addEventListener('click', () => {
            if (termsCheckbox) {
                termsCheckbox.checked = true;
            }
            if (termsModal) {
                termsModal.style.display = 'none';
            }
        });
    }
    
    // Close modal when clicking outside
    if (termsModal) {
        termsModal.addEventListener('click', (e) => {
            if (e.target === termsModal) {
                termsModal.style.display = 'none';
            }
        });
    }
});
