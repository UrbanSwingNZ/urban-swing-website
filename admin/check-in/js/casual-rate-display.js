/**
 * Update Casual Entry UI with Dynamic Pricing
 * This module updates the casual entry option labels to show the current prices
 */

let currentCasualRate = null;
let currentStudentRate = null;

/**
 * Initialize casual rate display
 * Call this after DOM is ready and Firebase is initialized
 */
async function initializeCasualRateDisplay() {
    try {
        // Get both casual rates
        const standardRate = await getStandardCasualRate();
        const studentRate = await getStudentCasualRate();
        
        if (standardRate) {
            currentCasualRate = standardRate;
            updateCasualEntryLabel(standardRate.price);
        } else {
            console.error('No standard casual rate found in Firestore');
            updateCasualEntryLabel('ERROR');
            showSnackbar('Failed to load casual rate. Please check pricing configuration in Admin Tools.', 'error');
        }
        
        if (studentRate) {
            currentStudentRate = studentRate;
            updateCasualStudentLabel(studentRate.price);
        } else {
            console.error('No student casual rate found in Firestore');
            updateCasualStudentLabel('ERROR');
            showSnackbar('Failed to load student casual rate. Please check pricing configuration in Admin Tools.', 'error');
        }
    } catch (error) {
        console.error('Error loading casual rates:', error);
        updateCasualEntryLabel('ERROR');
        updateCasualStudentLabel('ERROR');
        showSnackbar('Failed to load casual rates. Please check pricing configuration in Admin Tools.', 'error');
    }
}

/**
 * Update the casual entry radio button label with current price
 */
function updateCasualEntryLabel(price) {
    const casualLabel = document.querySelector('input[value="casual"]')?.parentElement.querySelector('.radio-label');
    
    if (casualLabel) {
        if (price === 'ERROR') {
            casualLabel.innerHTML = `Casual Entry <span style="color: #dc3545; font-weight: bold;">(ERROR - Check Pricing)</span>`;
        } else {
            casualLabel.textContent = `Casual Entry ($${price.toFixed(2)})`;
            console.log(`Updated casual entry label to $${price.toFixed(2)}`);
        }
    }
}

/**
 * Update the casual student radio button label with current price
 */
function updateCasualStudentLabel(price) {
    const casualStudentLabel = document.querySelector('input[value="casual-student"]')?.parentElement.querySelector('.radio-label');
    
    if (casualStudentLabel) {
        if (price === 'ERROR') {
            casualStudentLabel.innerHTML = `Casual Student <span style="color: #dc3545; font-weight: bold;">(ERROR - Check Pricing)</span>`;
        } else {
            casualStudentLabel.textContent = `Casual Student ($${price.toFixed(2)})`;
            console.log(`Updated casual student label to $${price.toFixed(2)}`);
        }
    }
}

/**
 * Get the current casual rate price
 * @returns {number|null} Current casual rate price or null if not loaded
 */
function getCurrentCasualPrice() {
    if (!currentCasualRate) {
        console.error('Casual rate not loaded - cannot get price');
        return null;
    }
    return currentCasualRate.price;
}

/**
 * Get the current student casual rate price
 * @returns {number|null} Current student casual rate price or null if not loaded
 */
function getCurrentStudentPrice() {
    if (!currentStudentRate) {
        console.error('Student casual rate not loaded - cannot get price');
        return null;
    }
    return currentStudentRate.price;
}

/**
 * Get the current casual rate object
 * @returns {Object|null} Current casual rate
 */
function getCurrentCasualRate() {
    return currentCasualRate;
}

/**
 * Get the current student casual rate object
 * @returns {Object|null} Current student casual rate
 */
function getCurrentStudentRate() {
    return currentStudentRate;
}
