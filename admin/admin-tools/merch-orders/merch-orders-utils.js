// merch-orders-utils.js - Utility functions for merchandise orders

/**
 * Format date for display
 */
export function formatDate(date, includeTime = false) {
    if (!date) return 'N/A';
    
    const day = date.getDate();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let formatted = `${day}/${month}/${year}`;
    
    if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        formatted += ` ${hours}:${minutes}`;
    }
    
    return formatted;
}

/**
 * Get human-readable shipping label
 */
export function getShippingLabel(shipping) {
    const labels = {
        'courier': 'Courier',
        'collect-urban-swing': 'Collect from Urban Swing',
        'collect-event': 'Collect at Event'
    };
    return labels[shipping] || shipping;
}

/**
 * Format product key to display name
 */
export function formatItemName(key) {
    const names = {
        'maliTee': 'Mali Tee',
        'cropTee': 'Crop Tee',
        'stapleTee': 'Staple Tee',
        'womensZipHood': "Women's Zip Hood",
        'mensZipHood': "Men's Zip Hood",
        'womensCrew': "Women's Crew",
        'mensCrew': "Men's Crew"
    };
    return names[key] || key;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show notification toast
 */
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color)'};
        color: var(--white);
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px var(--shadow-color);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
}
