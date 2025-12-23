/**
 * checkin-validation.js - Form validation for check-in submission
 * 
 * This module handles validation of check-in form inputs before saving to Firestore.
 */

import { saveCheckinToFirestore } from './checkin-save.js';

/**
 * Handle check-in submission
 */
export function handleCheckinSubmit() {
    const student = window.getSelectedStudent();
    if (!student) return;
    
    const entryType = document.querySelector('input[name="entry-type"]:checked')?.value;
    if (!entryType) {
        window.showSnackbar('Please select an entry type', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('payment-method').value;
    const freeEntryReason = document.getElementById('free-entry-reason').value;
    const notes = document.getElementById('checkin-notes').value;
    
    // Validate payment for casual entries
    if ((entryType === 'casual' || entryType === 'casual-student') && !paymentMethod) {
        window.showSnackbar('Please select a payment method for casual entry', 'error');
        return;
    }
    
    // Validate online payment transaction is selected
    if (entryType === 'online-payment') {
        const selectedTransaction = window.getSelectedOnlineTransaction();
        if (!selectedTransaction) {
            window.showSnackbar('Please select an online payment transaction', 'error');
            return;
        }
    }
    
    // Validate casual rate is loaded
    if (entryType === 'casual') {
        const casualPrice = window.getCurrentCasualPrice();
        if (casualPrice === null) {
            window.showSnackbar('Cannot process casual entry: Pricing not loaded. Please refresh the page or contact support.', 'error');
            return;
        }
    }
    
    // Validate student casual rate is loaded
    if (entryType === 'casual-student') {
        const studentPrice = window.getCurrentStudentPrice();
        if (studentPrice === null) {
            window.showSnackbar('Cannot process casual student entry: Pricing not loaded. Please refresh the page or contact support.', 'error');
            return;
        }
    }
    
    // Validate reason for free entry
    if (entryType === 'free' && !freeEntryReason) {
        window.showSnackbar('Please select a reason for free entry', 'error');
        return;
    }
    
    // All validation passed - save check-in to Firestore
    saveCheckinToFirestore(student, entryType, paymentMethod, freeEntryReason, notes);
}
