/**
 * Centralized Font Awesome Icon Constants
 * 
 * Single source of truth for all icon classes used across the app.
 * Ensures consistency and makes it easy to update icons globally.
 * 
 * Usage:
 *   import { ICONS, getMessageIcon } from '/js/utils/icon-constants.js';
 *   element.className = `fas ${ICONS.DELETE}`;
 *   const icon = getMessageIcon('success'); // Returns 'fa-check-circle'
 * 
 * @module icon-constants
 */

/**
 * Font Awesome icon class constants
 * All values are the icon class name without the 'fas' or 'far' prefix
 */
export const ICONS = {
    // ===== Actions =====
    DELETE: 'fa-trash-alt',
    EDIT: 'fa-edit',
    SAVE: 'fa-save',
    CLOSE: 'fa-times',
    CANCEL: 'fa-times',
    CONFIRM: 'fa-check',
    ADD: 'fa-plus',
    REMOVE: 'fa-minus',
    SEARCH: 'fa-search',
    FILTER: 'fa-filter',
    DOWNLOAD: 'fa-download',
    UPLOAD: 'fa-upload',
    REFRESH: 'fa-sync-alt',
    BACK: 'fa-arrow-left',
    FORWARD: 'fa-arrow-right',
    COPY: 'fa-copy',
    
    // ===== Status & Feedback =====
    SUCCESS: 'fa-check-circle',
    ERROR: 'fa-exclamation-circle',
    WARNING: 'fa-exclamation-triangle',
    INFO: 'fa-info-circle',
    QUESTION: 'fa-question-circle',
    
    // ===== Loading =====
    LOADING: 'fa-spinner fa-spin',
    
    // ===== Navigation =====
    HOME: 'fa-home',
    DASHBOARD: 'fa-home',
    MENU: 'fa-bars',
    CHEVRON_DOWN: 'fa-chevron-down',
    CHEVRON_UP: 'fa-chevron-up',
    CHEVRON_LEFT: 'fa-chevron-left',
    CHEVRON_RIGHT: 'fa-chevron-right',
    ARROW_UP: 'fa-arrow-up',
    
    // ===== User & Profile =====
    USER: 'fa-user',
    USER_CIRCLE: 'fa-user-circle',
    USERS: 'fa-users',
    USER_PLUS: 'fa-user-plus',
    USER_EDIT: 'fa-user-edit',
    USER_CHECK: 'fa-user-check',
    USER_FRIENDS: 'fa-user-friends',
    SIGN_IN: 'fa-sign-in-alt',
    SIGN_OUT: 'fa-sign-out-alt',
    LOGOUT: 'fa-sign-out-alt',
    
    // ===== Security =====
    LOCK: 'fa-lock',
    KEY: 'fa-key',
    SHIELD: 'fa-shield-alt',
    EYE: 'fa-eye',
    EYE_SLASH: 'fa-eye-slash',
    
    // ===== Business/Commerce =====
    SHOPPING_CART: 'fa-shopping-cart',
    SHOPPING_BAG: 'fa-shopping-bag',
    CREDIT_CARD: 'fa-credit-card',
    DOLLAR: 'fa-dollar-sign',
    RECEIPT: 'fa-receipt',
    TICKET: 'fa-ticket-alt',
    
    // ===== Calendar & Time =====
    CALENDAR: 'fa-calendar',
    CALENDAR_ALT: 'fa-calendar-alt',
    CALENDAR_CHECK: 'fa-calendar-check',
    CALENDAR_PLUS: 'fa-calendar-plus',
    CALENDAR_TIMES: 'fa-calendar-times',
    CLOCK: 'fa-clock',
    
    // ===== Communication =====
    ENVELOPE: 'fa-envelope',
    ENVELOPE_OPEN: 'fa-envelope-open-text',
    PHONE: 'fa-phone',
    PAPER_PLANE: 'fa-paper-plane',
    
    // ===== Content & Files =====
    FILE: 'fa-file-alt',
    FILE_CONTRACT: 'fa-file-contract',
    STICKY_NOTE: 'fa-sticky-note',
    CLIPBOARD: 'fa-clipboard-check',
    LIGHTBULB: 'fa-lightbulb',
    
    // ===== Location =====
    MAP_MARKER: 'fa-map-marker-alt',
    MAP_MARKED: 'fa-map-marked-alt',
    GLOBE: 'fa-globe',
    
    // ===== Payment Methods =====
    PAYMENT_ONLINE: 'fa-globe',
    PAYMENT_CASH: 'fa-money-bill-wave',
    PAYMENT_EFTPOS: 'fa-credit-card',
    PAYMENT_BANK: 'fa-building-columns',
    PAYMENT_UNKNOWN: 'fa-question-circle',
    
    // ===== Miscellaneous =====
    STAR: 'fa-star',
    GIFT: 'fa-gift',
    ID_CARD: 'fa-id-card',
    ID_BADGE: 'fa-id-badge',
    GRADUATION_CAP: 'fa-graduation-cap',
    HARD_HAT: 'fa-hard-hat'
};

/**
 * Get the appropriate icon class for a message type
 * 
 * Standardizes icon selection for success, error, warning, and info messages.
 * Used by showSnackbar() and other message display functions.
 * 
 * @param {string} type - Message type: 'success', 'error', 'warning', or 'info'
 * @returns {string} Font Awesome icon class (e.g., 'fa-check-circle')
 * 
 * @example
 * const icon = getMessageIcon('success'); // Returns 'fa-check-circle'
 * element.innerHTML = `<i class="fas ${icon}"></i> Operation successful`;
 */
export function getMessageIcon(type) {
    const iconMap = {
        'success': ICONS.SUCCESS,
        'error': ICONS.ERROR,
        'warning': ICONS.WARNING,
        'info': ICONS.INFO
    };
    return iconMap[type] || ICONS.INFO;
}

/**
 * Create an icon HTML element
 * 
 * Helper function to generate consistent icon markup.
 * 
 * @param {string} iconName - Key from ICONS object (e.g., 'DELETE', 'SUCCESS')
 * @param {string} additionalClasses - Optional additional CSS classes
 * @returns {string} HTML string for icon element
 * 
 * @example
 * const html = createIcon('DELETE', 'text-danger'); // '<i class="fas fa-trash-alt text-danger"></i>'
 */
export function createIcon(iconName, additionalClasses = '') {
    const iconClass = ICONS[iconName] || ICONS.QUESTION;
    return `<i class="fas ${iconClass} ${additionalClasses}"></i>`;
}
