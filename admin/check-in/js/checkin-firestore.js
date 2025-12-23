/**
 * checkin-firestore.js - Main coordinator for Firestore check-in operations
 * 
 * This module coordinates validation, saving, and transaction operations
 * for check-in functionality.
 */

import { handleCheckinSubmit } from './firestore/checkin-validation.js';

// Export functions for use by other modules
export { handleCheckinSubmit };

// Expose function to window for use by non-module scripts
window.handleCheckinSubmit = handleCheckinSubmit;

