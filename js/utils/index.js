/**
 * Centralized Utilities Library
 * 
 * This module re-exports all utility functions from specialized modules
 * AND makes them available globally for backward compatibility with non-module scripts.
 * 
 * @example
 * // Import as ES6 modules
 * import { escapeHtml, formatDate, isValidEmail } from '/js/utils/index.js';
 * 
 * // Or use globally (for non-module scripts)
 * escapeHtml(userInput);
 * formatDate(new Date());
 */

// Import all utilities first
import * as domUtils from './dom-utils.js';
import * as formatUtils from './format-utils.js';
import * as validationUtils from './validation-utils.js';
import * as dateUtils from './date-utils.js';
import * as uiUtils from './ui-utils.js';
import * as iconConstants from './icon-constants.js';

// Re-export for ES6 module imports
export * from './dom-utils.js';
export * from './format-utils.js';
export * from './validation-utils.js';
export * from './date-utils.js';
export * from './ui-utils.js';
export * from './icon-constants.js';

// Make utilities available globally for backward compatibility
// This allows non-module scripts to access these functions
window.escapeHtml = domUtils.escapeHtml;
window.createElement = domUtils.createElement;

window.formatDate = formatUtils.formatDate;
window.formatDateDDMMYYYY = formatUtils.formatDateDDMMYYYY;
window.formatCurrency = formatUtils.formatCurrency;
window.formatTime = formatUtils.formatTime;
window.formatTimestamp = formatUtils.formatTimestamp;
window.toTitleCase = formatUtils.toTitleCase;

window.isValidEmail = validationUtils.isValidEmail;
window.hasFieldChanged = validationUtils.hasFieldChanged;
window.isRequired = validationUtils.isRequired;

window.normalizeDate = dateUtils.normalizeDate;
window.isToday = dateUtils.isToday;
window.getStartOfToday = dateUtils.getStartOfToday;
window.getEndOfToday = dateUtils.getEndOfToday;
window.getTodayDateString = dateUtils.getTodayDateString;
window.formatDateToString = dateUtils.formatDateToString;
window.parseDateString = dateUtils.parseDateString;

window.showLoading = uiUtils.showLoading;
window.showError = uiUtils.showError;
window.navigateTo = uiUtils.navigateTo;
window.handleLogout = uiUtils.handleLogout;
window.showSnackbar = uiUtils.showSnackbar;

window.ICONS = iconConstants.ICONS;
window.getMessageIcon = iconConstants.getMessageIcon;
window.createIcon = iconConstants.createIcon;
