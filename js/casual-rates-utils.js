/**
 * Shared Casual Rates Utility
 * Use this across the application to fetch and cache casual rates from Firestore
 */

// Cache for casual rates to minimize Firestore reads
let casualRatesCache = null;
let casualRatesCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active casual rates from Firestore
 * @param {boolean} forceRefresh - Force refresh from Firestore
 * @returns {Promise<Array>} Array of casual rate objects
 */
async function getCasualRates(forceRefresh = false) {
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (!forceRefresh && casualRatesCache && casualRatesCacheTimestamp && (now - casualRatesCacheTimestamp < CACHE_DURATION)) {
        console.log('Returning cached casual rates');
        return casualRatesCache;
    }
    
    try {
        console.log('Fetching casual rates from Firestore...');
        const snapshot = await firebase.firestore()
            .collection('casualRates')
            .where('isActive', '==', true)
            .orderBy('displayOrder', 'asc')
            .get();
        
        const rates = [];
        snapshot.forEach(doc => {
            rates.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update cache
        casualRatesCache = rates;
        casualRatesCacheTimestamp = now;
        
        console.log(`Loaded ${rates.length} active casual rates`);
        return rates;
        
    } catch (error) {
        console.error('Error fetching casual rates:', error);
        
        // If we have cached data, return it even if expired
        if (casualRatesCache) {
            console.warn('Using expired cache due to error');
            return casualRatesCache;
        }
        
        throw error;
    }
}

/**
 * Get a specific casual rate by name
 * @param {string} name - Rate name (e.g., "Casual Entry", "Student Casual Entry")
 * @returns {Promise<Object|null>} Rate object or null if not found
 */
async function getCasualRateByName(name) {
    const rates = await getCasualRates();
    return rates.find(rate => rate.name === name) || null;
}

/**
 * Get the standard casual entry rate (non-student)
 * @returns {Promise<Object|null>} Rate object or null if not found
 */
async function getStandardCasualRate() {
    const rates = await getCasualRates();
    // Look for rates that don't contain "student" in the name
    return rates.find(rate => 
        !rate.name.toLowerCase().includes('student') && 
        !rate.isPromo
    ) || rates[0] || null;
}

/**
 * Get the student casual entry rate
 * @returns {Promise<Object|null>} Rate object or null if not found
 */
async function getStudentCasualRate() {
    const rates = await getCasualRates();
    return rates.find(rate => 
        rate.name.toLowerCase().includes('student') && 
        !rate.isPromo
    ) || null;
}

/**
 * Get casual rate price by name
 * @param {string} name - Rate name
 * @param {number} defaultPrice - Default price to return if rate not found
 * @returns {Promise<number>} Rate price
 */
async function getCasualRatePrice(name, defaultPrice = 15) {
    try {
        const rate = await getCasualRateByName(name);
        return rate ? rate.price : defaultPrice;
    } catch (error) {
        console.error('Error getting casual rate price:', error);
        return defaultPrice;
    }
}

/**
 * Clear the casual rates cache
 * Call this after updating rates to force a refresh
 */
function clearCasualRatesCache() {
    casualRatesCache = null;
    casualRatesCacheTimestamp = null;
    console.log('Casual rates cache cleared');
}

/**
 * Format casual rate for display
 * @param {Object} rate - Rate object
 * @returns {string} Formatted display string (e.g., "Casual Entry ($15)")
 */
function formatCasualRateDisplay(rate) {
    if (!rate) return 'Casual Entry';
    return `${rate.name} ($${rate.price.toFixed(2)})`;
}

/**
 * Get all casual rates including inactive ones (admin only)
 * @returns {Promise<Array>} Array of all casual rate objects
 */
async function getAllCasualRates() {
    try {
        const snapshot = await firebase.firestore()
            .collection('casualRates')
            .orderBy('displayOrder', 'asc')
            .get();
        
        const rates = [];
        snapshot.forEach(doc => {
            rates.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return rates;
        
    } catch (error) {
        console.error('Error fetching all casual rates:', error);
        throw error;
    }
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCasualRates,
        getCasualRateByName,
        getStandardCasualRate,
        getStudentCasualRate,
        getCasualRatePrice,
        clearCasualRatesCache,
        formatCasualRateDisplay,
        getAllCasualRates
    };
}
