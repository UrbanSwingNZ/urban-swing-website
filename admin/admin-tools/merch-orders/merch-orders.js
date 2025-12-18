// merch-orders.js - Merchandise Orders Management (Main)

import { loadOrders } from './merch-orders-data.js';
import {
    setOrders,
    renderOrders,
    viewOrderDetails,
    closeOrderModal,
    toggleInvoiced,
    markOrderComplete,
    deleteOrder,
    handleSearch,
    clearSearch,
    handleSort,
    updateOrderCount
} from './merch-orders-ui.js';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to initialize
    if (typeof firebase === 'undefined' || !firebase.auth) {
        setTimeout(() => document.dispatchEvent(new Event('DOMContentLoaded')), 100);
        return;
    }

    // Check authentication
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            initializePage();
        } else {
            window.location.href = '/admin/';
        }
    });
});

/**
 * Initialize the page
 */
async function initializePage() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const mainContainer = document.getElementById('main-container');
    
    try {
        // Load orders from Firestore
        const orders = await loadOrders();
        setOrders(orders);
        
        updateOrderCount();
        renderOrders();

        // Setup event listeners
        setupEventListeners();

        // Hide spinner and show content
        loadingSpinner.style.display = 'none';
        mainContainer.style.display = 'block';

    } catch (error) {
        console.error('Error loading orders:', error);
        alert('Error loading orders. Please check the console.');
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', clearSearch);

    // Table sorting
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => handleSort(header.dataset.sort));
    });
}

// Expose functions to global scope for inline onclick handlers
window.viewOrderDetails = viewOrderDetails;
window.closeOrderModal = closeOrderModal;
window.toggleInvoiced = toggleInvoiced;
window.markOrderComplete = markOrderComplete;
window.deleteOrder = deleteOrder;

