/**
 * save-button.js
 * Save button state management
 */

import { state } from '../core/state.js';

/**
 * Update save button state
 */
export function updateSaveButton() {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = !state.hasUnsavedChanges;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
}
