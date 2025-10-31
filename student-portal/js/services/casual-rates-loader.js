/**
 * Casual Rates Loader
 * Fetches casual rate prices from Firestore and displays them in the registration form
 */

/**
 * Load casual rates from Firestore and populate the price displays
 */
async function loadCasualRates() {
    try {
        // Wait for Firebase to be initialized
        if (!window.db) {
            console.error('Firebase not initialized');
            showRateError();
            return;
        }

        // Fetch active casual rates from Firestore
        const casualRatesSnapshot = await window.db.collection('casualRates')
            .where('isActive', '==', true)
            .get();
        
        if (casualRatesSnapshot.empty) {
            console.error('No casual rates found in database');
            showRateError();
            return;
        }

        // Map to match rate names to element IDs
        const rateMapping = {
            'Casual Entry': 'casual-entry-price',
            'Casual Entry (Student)': 'casual-student-price',
            'Student Casual Entry': 'casual-student-price', // Alternative name
            'Casual Student': 'casual-student-price' // Alternative name
        };

        // Process each rate document
        casualRatesSnapshot.forEach(doc => {
            const rate = doc.data();
            const rateName = rate.name;
            
            // Find the corresponding element ID
            const elementId = rateMapping[rateName];
            
            if (elementId) {
                const priceElement = document.getElementById(elementId);
                
                if (priceElement && rate.price !== undefined) {
                    // Format price as currency
                    const formattedPrice = `$${rate.price.toFixed(2)}`;
                    priceElement.textContent = formattedPrice;
                    priceElement.classList.add('loaded');
                }
            }
        });
    } catch (error) {
        console.error('Error loading casual rates:', error);
        showRateError();
    }
}

/**
 * Show error state for rate prices
 */
function showRateError() {
    const priceElements = document.querySelectorAll('.rate-price');
    priceElements.forEach(el => {
        el.textContent = 'Price unavailable';
        el.style.color = 'var(--admin-error)';
    });
}

// Load rates when DOM is ready and Firebase is initialized
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        loadCasualRates();
    }, 500);
});
