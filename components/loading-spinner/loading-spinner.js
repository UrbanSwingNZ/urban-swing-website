/**
 * Loading Spinner Component
 * Centralized loading spinner with multiple display modes
 * 
 * Usage:
 *   LoadingSpinner.showGlobal('Loading...')
 *   LoadingSpinner.hideGlobal()
 *   LoadingSpinner.showButton('submit-btn', 'Processing...')
 *   LoadingSpinner.hideButton('submit-btn')
 */

import { ICONS } from '/js/utils/icon-constants.js';

/**
 * Loading Spinner API
 */
export const LoadingSpinner = {
    /**
     * Show full-page overlay spinner
     * @param {string} message - Loading message to display
     */
    showGlobal(message = 'Loading...') {
        let spinner = document.getElementById('loading-spinner');
        
        // Create spinner if it doesn't exist
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loading-spinner';
            spinner.className = 'loading-spinner';
            spinner.innerHTML = `
                <div class="spinner spinner-medium"></div>
                <p>${message}</p>
            `;
            document.body.appendChild(spinner);
        } else {
            // Update message if spinner already exists
            const messageElement = spinner.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
        
        spinner.style.display = 'flex';
    },

    /**
     * Hide full-page overlay spinner
     */
    hideGlobal() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    },

    /**
     * Show loading state on a button
     * @param {string} buttonId - ID of button element
     * @param {string} loadingText - Text to display while loading
     */
    showButton(buttonId, loadingText = 'Loading...') {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        // Save original state
        button.disabled = true;
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        
        // Show loading state
        button.innerHTML = `<i class="fas ${ICONS.LOADING}"></i> ${loadingText}`;
    },

    /**
     * Hide loading state on a button
     * @param {string} buttonId - ID of button element
     * @param {string} originalText - Optional original text to restore
     */
    hideButton(buttonId, originalText = null) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        // Restore original state
        button.disabled = false;
        button.textContent = originalText || button.dataset.originalText || 'Submit';
        
        // Clean up data attribute
        if (button.dataset.originalText) {
            delete button.dataset.originalText;
        }
    },

    /**
     * Show spinner with options (advanced usage)
     * @param {Object} options - Configuration options
     * @param {string} options.containerId - Container element ID
     * @param {string} options.message - Loading message
     * @param {string} options.size - Spinner size: 'small', 'medium', 'large'
     */
    show(options = {}) {
        const {
            containerId = 'loading-spinner',
            message = 'Loading...',
            size = 'medium'
        } = options;
        
        let spinner = document.getElementById(containerId);
        
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = containerId;
            spinner.className = 'loading-spinner';
            spinner.innerHTML = `
                <div class="spinner spinner-${size}"></div>
                <p>${message}</p>
            `;
            document.body.appendChild(spinner);
        }
        
        spinner.style.display = 'flex';
    },

    /**
     * Hide spinner by container ID
     * @param {string} containerId - Container element ID
     */
    hide(containerId = 'loading-spinner') {
        const spinner = document.getElementById(containerId);
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
};

// Export globally for backward compatibility
window.LoadingSpinner = LoadingSpinner;

// Also export legacy function names for backward compatibility
window.showLoading = (show, message = 'Loading...') => {
    if (show) {
        LoadingSpinner.showGlobal(message);
    } else {
        LoadingSpinner.hideGlobal();
    }
};

window.showLoadingButton = (buttonId, show, loadingText = 'Loading...') => {
    if (show) {
        LoadingSpinner.showButton(buttonId, loadingText);
    } else {
        LoadingSpinner.hideButton(buttonId);
    }
};
