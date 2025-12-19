/**
 * Concession Types Tool Utility Functions
 * 
 * This file now imports from the centralized utilities library (/js/utils/)
 * and provides concession-types-specific utilities.
 */

// Import centralized utilities
import {
    escapeHtml,
    showLoading,
    showError
} from '/js/utils/index.js';

// Re-export for backward compatibility during migration
export {
    escapeHtml,
    showLoading,
    showError
};

/**
 * Show status message in drag hint element
 * Concession-types specific status display
 */
export function showStatusMessage(message, type = 'success') {
    const dragHint = document.getElementById('drag-hint');
    if (!dragHint) {
        // Fallback to alert if drag hint element doesn't exist
        alert(message);
        return;
    }
    
    const originalHTML = dragHint.innerHTML;
    const originalColor = dragHint.style.color;
    
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    const color = type === 'success' ? 'var(--admin-success)' : 'var(--admin-error)';
    
    dragHint.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    dragHint.style.color = color;
    
    setTimeout(() => {
        dragHint.innerHTML = originalHTML;
        dragHint.style.color = originalColor;
    }, 3000);
}
