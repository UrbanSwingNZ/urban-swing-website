/**
 * navigation.js
 * Handle navigation with unsaved changes warning
 */

import { state } from '../core/state.js';

let pendingNavigationCallback = null;

/**
 * Check for unsaved changes and show modal if needed
 * @param {Function} callback - Function to call if user confirms navigation
 * @returns {boolean} - True if navigation should proceed, false if blocked
 */
export function checkUnsavedChanges(callback) {
    if (state.hasUnsavedChanges) {
        // Store the callback to execute if user confirms
        pendingNavigationCallback = callback;
        
        // Show the modal
        const modal = document.getElementById('unsaved-changes-modal');
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        return false; // Block navigation for now
    }
    
    // No unsaved changes, proceed immediately
    if (callback) callback();
    return true;
}

/**
 * User confirmed they want to discard changes
 */
export function confirmDiscardChanges() {
    // Close modal
    const modal = document.getElementById('unsaved-changes-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    
    // Execute the pending navigation
    if (pendingNavigationCallback) {
        pendingNavigationCallback();
        pendingNavigationCallback = null;
    }
}

/**
 * User cancelled navigation
 */
export function cancelNavigation() {
    // Close modal
    const modal = document.getElementById('unsaved-changes-modal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    
    // Clear pending callback
    pendingNavigationCallback = null;
}

/**
 * Setup beforeunload handler for browser navigation
 */
export function setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', (e) => {
        if (state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
}
