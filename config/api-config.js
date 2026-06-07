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
    CONCESSION_PURCHASE: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/processConcessionPurchase`,

    /**
     * Process workshop registration payment
     * POST endpoint for processing workshop registration payments
     */
    WORKSHOP_PAYMENT: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/processWorkshopPayment`,

    /**
     * Cancel a student's workshop registration
     * POST endpoint: { studentId, workshopId }
     */
    WORKSHOP_DEREGISTER: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/deregisterWorkshop`,

    /**
     * Process one-time membership purchase
     * POST endpoint for non-recurring membership payments
     */
    MEMBERSHIP_PURCHASE_ONETIME: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/processOneTimeMembershipPurchase`,

    /**
     * Process recurring membership purchase
     * POST endpoint for auto-renewing membership subscriptions
     */
    MEMBERSHIP_PURCHASE_RECURRING: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/processRecurringMembershipPurchase`,

    /**
     * Toggle membership auto-renew
     * POST endpoint: { membershipId, enabled }
     */
    MEMBERSHIP_TOGGLE_AUTORENEW: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/toggleMembershipAutoRenew`,

    /**
     * Cancel membership
     * POST endpoint: { membershipId, cancelledBy }
     */
    MEMBERSHIP_CANCEL: `https://${FUNCTIONS_REGION}-${PROJECT_ID}.cloudfunctions.net/cancelMembership`
};

// Make API_CONFIG available globally for non-module scripts
window.API_CONFIG = API_CONFIG;

console.log('API Config initialized:', API_CONFIG);
