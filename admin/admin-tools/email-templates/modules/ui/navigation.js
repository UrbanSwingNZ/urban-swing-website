/**
 * navigation.js
 * Handle navigation with unsaved changes warning
 */

import { state } from '../core/state.js';
import { ConfirmationModal } from '/components/modals/confirmation-modal.js';

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
        
        // Show ConfirmationModal
        const modal = new ConfirmationModal({
            title: 'Unsaved Changes',
            message: 'You have unsaved changes to this template.',
            warning: 'If you continue, your changes will be lost.',
            icon: 'fas fa-exclamation-triangle',
            confirmText: 'Discard Changes',
            confirmClass: 'btn-delete',
            cancelText: 'Cancel',
            cancelClass: 'btn-cancel',
            variant: 'danger',
            onConfirm: confirmDiscardChanges,
            onCancel: cancelNavigation
        });
        
        modal.show();
        
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
