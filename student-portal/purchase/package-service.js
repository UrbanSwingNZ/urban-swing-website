/**
 * Package Service
 * Handles loading and managing concession packages
 */

class PackageService {
    constructor() {
        this.packages = [];
        this.selectedPackage = null;
    }
    
    /**
     * Load concession packages from Firestore
     * @returns {Promise<Array>} - Array of package objects
     */
    async loadPackages() {
        console.log('Loading concession packages...');
        
        try {
            const packagesQuery = firebase.firestore().collection('concessionPackages');
            const snapshot = await packagesQuery.get();
            
            if (snapshot.empty) {
                console.warn('No concession packages found');
                return [];
            }
            
            this.packages = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // Filter: only include active, non-promo packages
                if (data.isActive !== false && data.isPromo === false) {
                    this.packages.push({
                        id: doc.id,
                        name: data.name,
                        numberOfClasses: data.numberOfClasses,
                        price: data.price,
                        expiryMonths: data.expiryMonths,
                        displayOrder: data.displayOrder || 0
                    });
                }
            });
            
            // Sort by display order
            this.packages.sort((a, b) => a.displayOrder - b.displayOrder);
            
            return this.packages;
            
        } catch (error) {
            console.error('Error loading concession packages:', error);
            throw error;
        }
    }
    
    /**
     * Get all loaded packages
     * @returns {Array} - Array of package objects
     */
    getPackages() {
        return this.packages;
    }
    
    /**
     * Get package by ID
     * @param {string} packageId - Package ID
     * @returns {Object|null} - Package object or null
     */
    getPackageById(packageId) {
        return this.packages.find(p => p.id === packageId) || null;
    }
    
    /**
     * Set selected package
     * @param {string} packageId - Package ID
     * @returns {Object|null} - Selected package object or null
     */
    selectPackage(packageId) {
        this.selectedPackage = packageId ? this.getPackageById(packageId) : null;
        return this.selectedPackage;
    }
    
    /**
     * Get selected package
     * @returns {Object|null} - Selected package object or null
     */
    getSelectedPackage() {
        return this.selectedPackage;
    }
    
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedPackage = null;
    }
    
    /**
     * Format package description for display
     * @param {Object} pkg - Package object
     * @returns {string} - Formatted description
     */
    formatPackageDescription(pkg) {
        let description = `${pkg.numberOfClasses} class${pkg.numberOfClasses > 1 ? 'es' : ''}`;
        
        if (pkg.expiryMonths) {
            description += ` • Valid for ${pkg.expiryMonths} month${pkg.expiryMonths > 1 ? 's' : ''}`;
        }
        
        description += ` • ${formatCurrency(pkg.price)}`;
        
        return description;
    }
}
