/**
 * Snackbar Component
 * Centralized notification system with queue support
 * 
 * @module components/snackbar
 * @requires /js/utils/icon-constants.js
 * @requires /js/utils/dom-utils.js
 */

import { getMessageIcon } from '/js/utils/icon-constants.js';
import { escapeHtml } from '/js/utils/dom-utils.js';

// Active snackbars array for queue management
let activeSnackbars = [];

/**
 * Show snackbar notification with queue support
 * @param {string} message - Message to display
 * @param {string} type - Type of notification: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 * @example
 * showSnackbar('Check-in successful!', 'success', 3000)
 * showSnackbar('Error occurred', 'error')
 */
export function showSnackbar(message, type = 'success', duration = 3000) {
    // Validate inputs
    if (!message || message === null || message === undefined) {
        console.warn('showSnackbar: Empty or invalid message provided');
        return;
    }

    // Sanitize type - fallback to 'success' if invalid
    const validTypes = ['success', 'error', 'warning', 'info'];
    if (!validTypes.includes(type)) {
        console.warn(`showSnackbar: Invalid type "${type}", defaulting to "success"`);
        type = 'success';
    }

    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.id = `snackbar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    snackbar.className = `snackbar snackbar-${type}`;

    // Add icon based on type
    const icon = getMessageIcon(type);

    snackbar.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${escapeHtml(message)}</span>
    `;

    // Add to body
    document.body.appendChild(snackbar);

    // Add to active snackbars array
    activeSnackbars.push(snackbar);

    // Position snackbar based on queue
    updateSnackbarPositions();

    // Trigger animation
    setTimeout(() => {
        snackbar.classList.add('show');
    }, 10);

    // Auto-hide after duration
    const hideTimeout = setTimeout(() => {
        hideSnackbar(snackbar);
    }, duration);

    // Store timeout reference for potential cancellation
    snackbar.dataset.hideTimeout = hideTimeout;
}

/**
 * Hide and remove a snackbar
 * @param {HTMLElement} snackbar - Snackbar element to hide
 */
function hideSnackbar(snackbar) {
    // Remove 'show' class to trigger exit animation
    snackbar.classList.remove('show');

    // Remove from active snackbars array
    const index = activeSnackbars.indexOf(snackbar);
    if (index > -1) {
        activeSnackbars.splice(index, 1);
    }

    // Update positions of remaining snackbars
    updateSnackbarPositions();

    // Remove from DOM after animation completes
    setTimeout(() => {
        if (snackbar.parentNode) {
            snackbar.remove();
        }
    }, 300);
}

/**
 * Update positions of all active snackbars to stack them vertically
 */
function updateSnackbarPositions() {
    const baseBottom = 30; // Base position from bottom (px)
    const spacing = 80;    // Spacing between snackbars (px)

    activeSnackbars.forEach((snackbar, index) => {
        const bottom = baseBottom + (index * spacing);
        snackbar.style.setProperty('--snackbar-bottom', `${bottom}px`);
        snackbar.setAttribute('data-position', index);
    });
}

// Export to global scope for backward compatibility
window.showSnackbar = showSnackbar;
