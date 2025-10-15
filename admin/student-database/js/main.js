/**
 * Main Application Entry Point
 * Initializes all modules and coordinates application startup
 */

// Wait for Firebase to initialize
window.addEventListener('load', () => {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        showError('Firebase SDK failed to load. Please check your internet connection.');
        return;
    }

    if (!auth || !db) {
        console.error('Firebase not properly initialized');
        showError('Firebase configuration error. Please contact the administrator.');
        return;
    }

    initializeApp();
});

/**
 * Initialize application
 */
function initializeApp() {
    // Initialize authentication
    initializeAuth();
    
    // Initialize reusable purchase concessions modal
    initializePurchaseConcessionsModal();
    initializeAddConcessionModal();
    
    // Initialize modal event listeners
    initializeModalListeners();
    
    // Initialize search
    initializeSearch();
}

/**
 * Initialize DOM event listeners
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
});
