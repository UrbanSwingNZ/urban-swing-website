/**
 * Update Casual Entry UI with Dynamic Pricing
 * This module updates the casual entry option label to show the current price
 */

let currentCasualRate = null;

/**
 * Initialize casual rate display
 * Call this after DOM is ready and Firebase is initialized
 */
async function initializeCasualRateDisplay() {
    try {
        // Get the standard casual rate
        const rate = await getStandardCasualRate();
        
        if (rate) {
            currentCasualRate = rate;
            updateCasualEntryLabel(rate.price);
        } else {
            console.warn('No casual rate found, using default $15');
            currentCasualRate = { name: 'Casual Entry', price: 15, isActive: true };
        }
    } catch (error) {
        console.error('Error loading casual rate:', error);
        // Use default if fetch fails
        currentCasualRate = { name: 'Casual Entry', price: 15, isActive: true };
    }
}

/**
 * Update the casual entry radio button label with current price
 */
function updateCasualEntryLabel(price) {
    const casualLabel = document.querySelector('input[value="casual"]')?.parentElement.querySelector('.radio-label');
    
    if (casualLabel) {
        casualLabel.textContent = `Casual Entry ($${price.toFixed(2)})`;
        console.log(`Updated casual entry label to $${price.toFixed(2)}`);
    }
}

/**
 * Get the current casual rate price
 * @returns {number} Current casual rate price
 */
function getCurrentCasualPrice() {
    return currentCasualRate ? currentCasualRate.price : 15;
}

/**
 * Get the current casual rate object
 * @returns {Object|null} Current casual rate
 */
function getCurrentCasualRate() {
    return currentCasualRate;
}
