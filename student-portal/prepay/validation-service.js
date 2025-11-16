/**
 * Validation Service
 * Handles form and date validation for prepay
 */

class ValidationService {
    constructor() {
        this.db = window.db || firebase.firestore();
    }
    
    /**
     * Validate if a date is a Thursday
     * @param {Date} date - Date to check
     * @returns {boolean} - True if Thursday
     */
    isThursday(date) {
        return date.getDay() === 4;
    }
    
    /**
     * Check if date is in the past
     * @param {Date} date - Date to check
     * @returns {boolean} - True if past date
     */
    isPastDate(date) {
        const today = normalizeDate(new Date());
        const checkDate = normalizeDate(date);
        return checkDate < today;
    }
    
    /**
     * Validate selected class date
     * @param {Date} selectedDate - Date to validate
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} - {isValid: boolean, message: string}
     */
    async validateClassDate(selectedDate, studentId) {
        if (!selectedDate) {
            return {
                isValid: false,
                message: 'Please select a class date.'
            };
        }
        
        // Check if date is in the past
        if (this.isPastDate(selectedDate)) {
            return {
                isValid: false,
                message: 'Please select a current or future date.'
            };
        }
        
        // Validate it's a Thursday
        if (!this.isThursday(selectedDate)) {
            return {
                isValid: false,
                message: 'Please select a Thursday. Classes are only held on Thursdays.'
            };
        }
        
        // Check for duplicate prepayment
        const duplicateCheck = await this.checkForDuplicateClass(selectedDate, studentId);
        if (!duplicateCheck.isValid) {
            return duplicateCheck;
        }
        
        return {
            isValid: true,
            message: ''
        };
    }
    
    /**
     * Check if student has already prepaid for a class on this date
     * @param {Date} selectedDate - Date to check
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} - {isValid: boolean, message: string, hasExisting: boolean}
     */
    async checkForDuplicateClass(selectedDate, studentId) {
        if (!studentId) {
            return {
                isValid: true,
                hasExisting: false,
                message: ''
            };
        }
        
        try {
            // Query for existing transactions for this student
            const snapshot = await this.db.collection('transactions')
                .where('studentId', '==', studentId)
                .get();
            
            // Filter by date and type in JavaScript
            const startOfDay = normalizeDate(selectedDate);
            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            const matchingTransactions = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                
                // Check if it's a casual transaction (not reversed)
                if ((data.type === 'casual' || data.type === 'casual-student') && !data.reversed) {
                    let dateToCheck = null;
                    
                    if (data.classDate) {
                        dateToCheck = data.classDate.toDate();
                    } else if (data.transactionDate) {
                        // Backwards compatibility
                        dateToCheck = data.transactionDate.toDate();
                    }
                    
                    if (dateToCheck && dateToCheck >= startOfDay && dateToCheck <= endOfDay) {
                        matchingTransactions.push({
                            id: doc.id,
                            type: data.type,
                            date: dateToCheck
                        });
                    }
                }
            });
            
            const hasExisting = matchingTransactions.length > 0;
            
            if (hasExisting) {
                return {
                    isValid: false,
                    hasExisting: true,
                    message: 'You have already pre-paid for a class on this date. Please select a different date.'
                };
            }
            
            return {
                isValid: true,
                hasExisting: false,
                message: ''
            };
            
        } catch (error) {
            console.error('Error checking for duplicate class:', error);
            // Don't block user if validation fails
            return {
                isValid: true,
                hasExisting: false,
                message: '',
                error: error.message
            };
        }
    }
    
    /**
     * Update UI with validation message
     * @param {boolean} isValid - Whether date is valid
     * @param {string} message - Message to display
     * @param {string} messageElementId - ID of message element
     * @param {string} submitButtonId - ID of submit button
     * @param {string} fieldHelpClass - Class of field help text
     */
    updateValidationUI(isValid, message, messageElementId = 'date-validation-message', 
                       submitButtonId = 'submit-btn', fieldHelpClass = 'field-help') {
        const messageEl = document.getElementById(messageElementId);
        const fieldHelp = document.querySelector(`.${fieldHelpClass}`);
        
        if (!messageEl) return;
        
        if (!isValid) {
            // Show error message
            messageEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            messageEl.className = 'validation-message error';
            messageEl.style.display = 'block';
            
            // Hide help text
            if (fieldHelp) fieldHelp.style.display = 'none';
        } else {
            // Clear error message
            messageEl.style.display = 'none';
            
            // Show help text
            if (fieldHelp) fieldHelp.style.display = 'block';
        }
        
        // Don't directly control submit button - let updateSubmitButtonState handle it
    }
}
