/**
 * API Configuration
 * Defines API endpoints for Firebase Cloud Functions
 */

// Firebase Functions region and project ID
const FUNCTIONS_REGION = 'us-central1';
const PROJECT_ID = 'directed-curve-447204-j4';

/**
 * API Configuration Object
 * Contains all API endpoints for the application
 */
const API_CONFIG = {
    /**
     * Process casual entry payment
     * POST endpoint for processing casual class payments
     */
    CASUAL_PAYMENT: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/processCasualPayment`,
    
    /**
     * Process concession package purchase
     * POST endpoint for processing concession purchases
     */
    CONCESSION_PURCHASE: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/processConcessionPurchase`
};

// Make API_CONFIG available globally for non-module scripts
window.API_CONFIG = API_CONFIG;

console.log('API Config initialized:', API_CONFIG);
