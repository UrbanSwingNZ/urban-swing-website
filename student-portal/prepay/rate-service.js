/**
 * Rate Service
 * Handles loading and managing casual rates
 */

class RateService {
    constructor() {
        this.rates = [];
        this.selectedRateId = null;
    }
    
    /**
     * Load casual rates from Firestore
     * @returns {Promise<Array>} - Array of rate objects
     */
    async loadRates() {
        console.log('Loading casual rates...');
        
        try {
            const ratesQuery = firebase.firestore().collection('casualRates');
            const snapshot = await ratesQuery.get();
            
            if (snapshot.empty) {
                console.warn('No casual rates found');
                return [];
            }
            
            this.rates = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Filter: only include active rates
                if (data.isActive !== false) {
                    this.rates.push({
                        id: doc.id,
                        name: data.name,
                        price: data.price,
                        description: data.description || '',
                        isPromo: data.isPromo === true,
                        displayOrder: data.displayOrder || 999
                    });
                }
            });
            
            // Sort by display order
            this.rates.sort((a, b) => a.displayOrder - b.displayOrder);
            
            return this.rates;
            
        } catch (error) {
            console.error('Error loading casual rates:', error);
            throw error;
        }
    }
    
    /**
     * Get all loaded rates
     * @returns {Array} - Array of rate objects
     */
    getRates() {
        return this.rates;
    }
    
    /**
     * Get rate by ID
     * @param {string} rateId - Rate ID
     * @returns {Object|null} - Rate object or null
     */
    getRateById(rateId) {
        return this.rates.find(r => r.id === rateId) || null;
    }
    
    /**
     * Set selected rate
     * @param {string} rateId - Rate ID
     * @returns {Object|null} - Selected rate object or null
     */
    selectRate(rateId) {
        this.selectedRateId = rateId;
        return this.getRateById(rateId);
    }
    
    /**
     * Get selected rate
     * @returns {Object|null} - Selected rate object or null
     */
    getSelectedRate() {
        if (!this.selectedRateId) return null;
        return this.getRateById(this.selectedRateId);
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedRateId = null;
    }
}
