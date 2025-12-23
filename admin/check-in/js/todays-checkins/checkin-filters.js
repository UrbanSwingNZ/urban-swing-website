/**
 * checkin-filters.js - Filter check-ins by reversed status
 */

import { displayTodaysCheckins } from './checkin-display.js';

let showReversedCheckins = false;

/**
 * Toggle show reversed check-ins
 */
export function toggleShowReversedCheckins(event) {
    showReversedCheckins = event.target.checked;
    displayTodaysCheckins();
    
    // Also refresh transactions display
    if (typeof refreshCheckinTransactionsDisplay === 'function') {
        refreshCheckinTransactionsDisplay();
    }
}

/**
 * Get show reversed checkins state
 */
export function getShowReversedCheckins() {
    return showReversedCheckins;
}
