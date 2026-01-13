/**
 * gift-form.js - Gift form UI, validation, and summary
 * Handles form initialization, DatePickers, presets, validation, and live summary updates
 */

import { getSelectedStudent } from './student-search.js';
import { processGift } from './gift-api.js';

/**
 * Convert date from d/mm/yyyy format to Date object
 */
function parseDateFromInput(dateString) {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('/').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Initialize form elements and event listeners
 */
export function initializeForm() {
    const form = document.getElementById('gift-form');
    const studentSearch = document.getElementById('student-search');
    const clearSearchBtn = document.getElementById('clear-student-search');
    
    // Initialize custom date pickers
    const today = new Date();
    
    // Gift Date picker (defaults to today, no future dates)
    const giftDatePicker = new DatePicker('gift-date', 'gift-date-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: false, // Allow past dates
        ignoreClosedown: true, // Admin can select any date including closedown periods
        onDateSelected: (date, formattedDate) => {
            updateSummary();
        }
    });
    giftDatePicker.setDate(today);
    
    // Expiry Date picker (future dates only)
    const expiryDatePicker = new DatePicker('gift-expiry', 'gift-expiry-calendar', {
        allowedDays: [0, 1, 2, 3, 4, 5, 6], // All days
        disablePastDates: true, // Only future dates
        ignoreClosedown: true, // Admin can select any date including closedown periods
        onDateSelected: (date, formattedDate) => {
            updateSummary();
        }
    });
    
    // Student search (handled by student-search module, but we set up listeners here)
    import('./student-search.js').then(({ handleStudentSearch }) => {
        studentSearch.addEventListener('input', handleStudentSearch);
        studentSearch.addEventListener('focus', handleStudentSearch);
    });
    
    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            import('./student-search.js').then(({ getSelectedStudent }) => {
                studentSearch.value = '';
                clearSearchBtn.style.display = 'none';
                document.getElementById('student-results').style.display = 'none';
                if (!getSelectedStudent()) {
                    studentSearch.focus();
                }
            });
        });
    }
    
    // Click outside to close search results
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            document.getElementById('student-results').style.display = 'none';
        }
    });
    
    // Form field listeners for live summary update
    document.getElementById('gift-quantity').addEventListener('input', updateSummary);
    document.getElementById('gift-notes').addEventListener('input', updateSummary);
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Apply a preset package
 */
export function applyPreset(quantity, months) {
    document.getElementById('gift-quantity').value = quantity;
    
    // Calculate expiry date from gift date
    const giftDateStr = document.getElementById('gift-date').value;
    const giftDate = parseDateFromInput(giftDateStr);
    const expiryDate = new Date(giftDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);
    
    // Format as d/mm/yyyy for DatePicker
    const day = String(expiryDate.getDate()).padStart(2, '0');
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const year = expiryDate.getFullYear();
    document.getElementById('gift-expiry').value = `${day}/${month}/${year}`;
    
    updateSummary();
}

/**
 * Update the summary section
 */
export function updateSummary() {
    const selectedStudent = getSelectedStudent();
    const quantity = parseInt(document.getElementById('gift-quantity').value) || 0;
    const expiryDateStr = document.getElementById('gift-expiry').value;
    const expiryDate = expiryDateStr ? parseDateFromInput(expiryDateStr) : null;
    const notes = document.getElementById('gift-notes').value.trim();
    
    // Update summary fields
    document.getElementById('summary-student').textContent = selectedStudent 
        ? getStudentFullName(selectedStudent) 
        : '-';
    
    document.getElementById('summary-quantity').textContent = quantity;
    
    const currentBalance = selectedStudent ? (selectedStudent.concessionBalance || 0) : 0;
    const newBalance = currentBalance + quantity;
    document.getElementById('summary-new-balance').textContent = newBalance;
    
    document.getElementById('summary-expiry').textContent = expiryDate 
        ? formatDate(expiryDate) 
        : '-';
    
    document.getElementById('summary-notes').textContent = notes || '-';
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('gift-submit-btn');
    const isValid = selectedStudent && quantity > 0 && expiryDate && notes.length > 0;
    submitBtn.disabled = !isValid;
}

/**
 * Handle form submission
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const selectedStudent = getSelectedStudent();
    if (!selectedStudent) {
        showError('Please select a student');
        return;
    }
    
    const quantity = parseInt(document.getElementById('gift-quantity').value);
    const expiryDateStr = document.getElementById('gift-expiry').value;
    const expiryDate = parseDateFromInput(expiryDateStr);
    const giftDateStr = document.getElementById('gift-date').value;
    const giftDate = parseDateFromInput(giftDateStr);
    const notes = document.getElementById('gift-notes').value.trim();
    
    // Validation
    if (quantity < 1 || quantity > 100) {
        showError('Quantity must be between 1 and 100');
        return;
    }
    
    if (expiryDate <= giftDate) {
        showError('Expiry date must be after gift date');
        return;
    }
    
    if (notes.length < 3) {
        showError('Please provide a reason for this gift (minimum 3 characters)');
        return;
    }
    
    // Show confirmation modal
    const fullName = getStudentFullName(selectedStudent);
    showConfirmModal(fullName, quantity, expiryDate, notes, giftDate);
}

/**
 * Show confirmation modal
 */
function showConfirmModal(studentName, quantity, expiryDate, notes, giftDate) {
    import('/components/modals/confirmation-modal.js').then(({ ConfirmationModal }) => {
        const details = `
            <div class="confirm-details">
                <div class="confirm-row">
                    <span>Student:</span>
                    <strong>${studentName}</strong>
                </div>
                <div class="confirm-row">
                    <span>Classes:</span>
                    <strong>${quantity} class${quantity !== 1 ? 'es' : ''}</strong>
                </div>
                <div class="confirm-row">
                    <span>Expiry Date:</span>
                    <strong>${formatDate(expiryDate)}</strong>
                </div>
                <div class="confirm-row">
                    <span>Reason:</span>
                    <strong>${notes}</strong>
                </div>
            </div>
        `;

        const modal = new ConfirmationModal({
            title: 'Confirm Gift',
            message: 'Are you sure you want to gift these concessions?' + details,
            confirmText: 'Yes, Gift Concessions',
            cancelText: 'Cancel',
            cancelClass: 'btn-cancel',
            onConfirm: async () => {
                await processGift();
            }
        });
        
        modal.show();
    });
}

/**
 * Reset the form
 */
export function resetForm() {
    document.getElementById('gift-form').reset();
    
    // Clear selected student (from student-search module)
    import('./student-search.js').then(({ clearSelectedStudent }) => {
        clearSelectedStudent();
    });
    
    // Reset to defaults
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    document.getElementById('gift-date').value = `${day}/${month}/${year}`;
    
    updateSummary();
}

/**
 * Get student full name
 */
function getStudentFullName(student) {
    if (!student) return 'Unknown';
    const firstName = student.firstName || '';
    const lastName = student.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
}

/**
 * Show error message
 */
function showError(message) {
    // Create modal using BaseModal directly to only have one button
    import('/components/modals/modal-base.js').then(({ BaseModal }) => {
        const modal = new BaseModal({
            title: '<i class="fas fa-exclamation-circle"></i> Error',
            content: message,
            size: 'small',
            buttons: [
                {
                    text: 'OK',
                    class: 'btn-cancel',
                    onClick: (m) => m.hide()
                }
            ]
        });
        
        // Add danger variant styling
        modal.element.classList.add('modal-danger');
        modal.show();
    });
}

// Import centralized utilities
import { formatDate } from '/js/utils/index.js';

// Expose functions to window for onclick handlers and other modules
window.updateSummary = updateSummary;
