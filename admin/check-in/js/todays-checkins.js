/**
 * todays-checkins.js - Main coordinator for today's check-ins list
 * 
 * This module coordinates the loading, display, and filtering of check-ins
 * for the selected date on the check-in page.
 */

import { 
    loadTodaysCheckins, 
    addCheckinToDisplay, 
    getTodaysCheckins 
} from './todays-checkins/checkin-loader.js';

import { displayTodaysCheckins } from './todays-checkins/checkin-display.js';

import { 
    toggleShowReversedCheckins, 
    getShowReversedCheckins 
} from './todays-checkins/checkin-filters.js';

// Export all functions for use by other modules
export {
    loadTodaysCheckins,
    addCheckinToDisplay,
    getTodaysCheckins,
    displayTodaysCheckins,
    toggleShowReversedCheckins,
    getShowReversedCheckins
};

// Expose functions to window for use by non-module scripts
window.loadTodaysCheckins = loadTodaysCheckins;
window.toggleShowReversedCheckins = toggleShowReversedCheckins;
