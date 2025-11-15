/**
 * stripe-config.js
 * Stripe API configuration and initialization
 */

require('dotenv').config();
const Stripe = require('stripe');
const admin = require('firebase-admin');

// Initialize Stripe with secret key from environment variables
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Currency configuration
const CURRENCY = 'nzd'; // New Zealand Dollars

/**
 * Fetch pricing from Firestore
 * Dynamically fetches ALL active, non-promo rates and packages
 * @returns {Promise<Object>} Package prices in cents with metadata
 */
async function fetchPricing() {
  const db = admin.firestore();
  const packages = {};
  
  try {
    // Fetch casual rates from Firestore
    const casualRatesSnapshot = await db.collection('casualRates').get();
    
    casualRatesSnapshot.forEach(doc => {
      const rate = doc.data();
      const docId = doc.id;
      
      // Include all active, non-promo casual rates
      if (rate.isActive && !rate.isPromo) {
        packages[docId] = {
          price: Math.round(rate.price * 100), // Convert to cents
          name: rate.name || 'Casual Entry',
          type: 'casual-rate',
          description: rate.description || null
        };
      }
    });
    
    // Fetch concession packages from Firestore
    const concessionPackagesSnapshot = await db.collection('concessionPackages').get();
    
    concessionPackagesSnapshot.forEach(doc => {
      const pkg = doc.data();
      const docId = doc.id;
      
      // Include all active, non-promo concession packages
      if (pkg.isActive && !pkg.isPromo) {
        packages[docId] = {
          price: Math.round(pkg.price * 100), // Convert to cents
          name: pkg.name || `${pkg.numberOfClasses}-Class Package`,
          type: 'concession-package',
          numberOfClasses: pkg.numberOfClasses,
          expiryMonths: pkg.expiryMonths,
          description: pkg.description || null
        };
      }
    });
    
    if (Object.keys(packages).length === 0) {
      throw new Error('No active packages found for purchase');
    }
    
    console.log('Fetched packages from Firestore:', Object.keys(packages));
    return packages;
    
  } catch (error) {
    console.error('Error fetching pricing from Firestore:', error);
    throw new Error(`Failed to fetch pricing: ${error.message}`);
  }
}

module.exports = {
  stripe,
  fetchPricing,
  CURRENCY
};
