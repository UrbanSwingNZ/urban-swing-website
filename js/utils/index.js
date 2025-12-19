/**
 * Centralized Utilities Library
 * 
 * This module re-exports all utility functions from specialized modules.
 * Import utilities from this single entry point for convenience.
 * 
 * @example
 * // Import specific utilities
 * import { escapeHtml, formatDate, isValidEmail } from '/js/utils/index.js';
 * 
 * // Or import from specific modules
 * import { escapeHtml } from '/js/utils/dom-utils.js';
 * import { formatDate } from '/js/utils/format-utils.js';
 */

// DOM utilities - XSS protection and element creation
export * from './dom-utils.js';

// Format utilities - dates, currency, text formatting
export * from './format-utils.js';

// Validation utilities - form validation and data checking
export * from './validation-utils.js';

// Date utilities - date manipulation and comparison
export * from './date-utils.js';

// UI utilities - loading states, errors, navigation
export * from './ui-utils.js';
