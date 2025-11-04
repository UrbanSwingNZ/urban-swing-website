/**
 * get-available-packages.js
 * Firebase Callable Function to get available packages for purchase
 */

const { onCall } = require('firebase-functions/v2/https');
const { fetchPricing } = require('./stripe/stripe-config');

/**
 * Get available packages for student registration
 * Returns all active, non-promo packages with pricing
 * Callable Firebase Function - no authentication required
 */
exports.getAvailablePackages = onCall(
  { 
    region: 'us-central1',
    cors: true,
    invoker: 'public'
  },
  async (request) => {
    try {
      const packages = await fetchPricing();
      
      // Transform to frontend-friendly format
      const availablePackages = Object.entries(packages).map(([id, info]) => ({
        id: id,
        name: info.name,
        price: info.price / 100, // Convert cents back to dollars
        type: info.type,
        numberOfClasses: info.numberOfClasses || null,
        description: info.description || null
      }));
      
      // Sort packages: casual rates first, then concession packages by number of classes
      availablePackages.sort((a, b) => {
        if (a.type === 'casual-rate' && b.type !== 'casual-rate') return -1;
        if (a.type !== 'casual-rate' && b.type === 'casual-rate') return 1;
        if (a.numberOfClasses && b.numberOfClasses) {
          return a.numberOfClasses - b.numberOfClasses;
        }
        return 0;
      });
      
      return {
        success: true,
        packages: availablePackages
      };
      
    } catch (error) {
      console.error('Error fetching available packages:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
);
