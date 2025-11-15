/**
 * Prepaid Classes Service
 * Handles loading and displaying prepaid classes
 */

class PrepaidClassesService {
    constructor() {
        this.db = window.db || firebase.firestore();
    }
    
    /**
     * Load prepaid classes for a student
     * @param {string} studentId - Student ID
     * @returns {Promise<Array>} - Array of prepaid class objects
     */
    async loadPrepaidClasses(studentId) {
        try {
            // Query transactions for prepaid classes
            const snapshot = await this.db.collection('transactions')
                .where('studentId', '==', studentId)
                .get();
            
            // Filter for future prepaid classes (casual entries that haven't happened yet)
            const today = normalizeDate(new Date());
            const prepaidClasses = [];
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // Check if it's a casual transaction (not reversed) with a future class date
                if ((data.type === 'casual' || data.type === 'casual-student' || 
                     data.type === 'casual-entry') && !data.reversed) {
                    
                    let classDate = null;
                    if (data.classDate) {
                        classDate = data.classDate.toDate();
                    } else if (data.transactionDate) {
                        // Backwards compatibility
                        classDate = data.transactionDate.toDate();
                    }
                    
                    if (classDate && normalizeDate(classDate) >= today) {
                        prepaidClasses.push({
                            id: doc.id,
                            classDate: classDate,
                            purchaseDate: data.transactionDate?.toDate() || classDate,
                            type: data.type,
                            entryType: data.entryType || data.type,
                            ...data
                        });
                    }
                }
            });
            
            // Sort by class date (earliest first)
            prepaidClasses.sort((a, b) => a.classDate - b.classDate);
            
            return prepaidClasses;
            
        } catch (error) {
            console.error('Error loading prepaid classes:', error);
            throw error;
        }
    }
    
    /**
     * Display prepaid classes in the UI
     * @param {Array} prepaidClasses - Array of prepaid class objects
     */
    displayPrepaidClasses(prepaidClasses) {
        const section = document.getElementById('prepaid-classes-section');
        const list = document.getElementById('prepaid-classes-list');
        
        if (!prepaidClasses || prepaidClasses.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        // Show section
        section.style.display = 'block';
        
        // Clear existing content
        list.innerHTML = '';
        
        // Create items for each prepaid class
        prepaidClasses.forEach(classItem => {
            const item = this.createPrepaidClassItem(classItem);
            list.appendChild(item);
        });
    }
    
    /**
     * Create a prepaid class item element
     * @param {Object} classItem - Prepaid class data
     * @returns {HTMLElement} - The created element
     */
    createPrepaidClassItem(classItem) {
        const item = document.createElement('div');
        item.className = 'prepaid-class-item';
        
        // Ensure dates are Date objects (in case they're Firestore Timestamps)
        const classDate = classItem.classDate instanceof Date 
            ? classItem.classDate 
            : (classItem.classDate?.toDate ? classItem.classDate.toDate() : new Date(classItem.classDate));
        const purchaseDate = classItem.purchaseDate instanceof Date 
            ? classItem.purchaseDate 
            : (classItem.purchaseDate?.toDate ? classItem.purchaseDate.toDate() : new Date(classItem.purchaseDate));
        
        const day = classDate.getDate();
        const monthYear = this.formatMonthYear(classDate);
        const classDayFormatted = this.formatDateDDMMYYYY(classDate);
        const purchaseDateFormatted = this.formatDateDDMMYYYY(purchaseDate);
        
        // Determine entry type and badge class
        const typeInfo = this.getEntryTypeInfo(classItem);
        
        item.innerHTML = `
            <div class="prepaid-class-info">
                <div class="prepaid-class-date">
                    <div class="day">${day}</div>
                    <div class="month-year">${monthYear}</div>
                </div>
                <div class="prepaid-class-details">
                    <div class="detail-row">
                        <span class="detail-label">Class Date:</span>
                        <span class="detail-value">${classDayFormatted}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Purchased:</span>
                        <span class="detail-value">${purchaseDateFormatted}</span>
                    </div>
                </div>
            </div>
            <div class="prepaid-class-badge">
                <span class="type-badge ${typeInfo.badgeClass}">${typeInfo.typeName}</span>
            </div>
        `;
        
        return item;
    }
    
    /**
     * Format date as DD/MM/YYYY (matching transaction history)
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date string
     */
    formatDateDDMMYYYY(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    /**
     * Get entry type information for badge styling
     * @param {Object} classItem - Prepaid class data
     * @returns {Object} - Type name and badge class
     */
    getEntryTypeInfo(classItem) {
        const entryType = classItem.entryType || classItem.type;
        
        if (entryType === 'casual-student') {
            return {
                typeName: 'Casual Student',
                badgeClass: 'casual-student'
            };
        } else if (entryType === 'casual' || entryType === 'casual-entry') {
            return {
                typeName: 'Casual Entry',
                badgeClass: 'casual'
            };
        } else {
            return {
                typeName: 'Casual Entry',
                badgeClass: 'casual'
            };
        }
    }
    
    /**
     * Format month and year (e.g., "Nov 2025")
     * @param {Date} date - Date to format
     * @returns {string} - Formatted month and year
     */
    formatMonthYear(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
    }
}
