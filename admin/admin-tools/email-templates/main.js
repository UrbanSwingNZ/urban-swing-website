/**
 * main.js
 * Main entry point for Email Templates Management Tool (Refactored)
 * Version: 2.0.0
 * 
 * This is a lightweight orchestrator that imports modular components.
 * All logic has been split into focused, maintainable modules.
 */

import { initializeAuth } from './modules/firebase/auth.js';
import { setupEventListeners } from './modules/ui/event-listeners.js';
import { restoreVersion } from './modules/ui/version-history.js';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check authentication
        initializeAuth();
        
        // Setup event listeners
        setupEventListeners();
        
        // Make restoreVersion available globally for onclick handlers
        window.restoreVersion = restoreVersion;
        
    } catch (error) {
        console.error('Initialization error:', error);
        const { showError } = await import('./modules/ui/notifications.js');
        showError('Failed to initialize: ' + error.message);
    }
});
