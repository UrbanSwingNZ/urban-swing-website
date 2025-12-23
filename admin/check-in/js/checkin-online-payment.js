/**
 * checkin-online-payment.js - Main coordinator for online payment validation
 * 
 * This module coordinates the validation, display, and selection of online payment
 * transactions when checking in students at the front desk.
 */

import { 
    validateOnlinePayment, 
    checkStudentHasOnlinePayments, 
    checkAndAutoSelectOnlinePayment 
} from './online-payment/payment-validation.js';

import { 
    displayOnlinePaymentStatus, 
    showOnlinePaymentError 
} from './online-payment/payment-display.js';

import { 
    selectOnlineTransaction, 
    showAllOnlineTransactions, 
    getSelectedOnlineTransaction, 
    clearSelectedOnlineTransaction, 
    updateTransactionDate 
} from './online-payment/payment-selection.js';

// Export all functions for use by other modules
export {
    validateOnlinePayment,
    checkStudentHasOnlinePayments,
    checkAndAutoSelectOnlinePayment,
    displayOnlinePaymentStatus,
    showOnlinePaymentError,
    selectOnlineTransaction,
    showAllOnlineTransactions,
    getSelectedOnlineTransaction,
    clearSelectedOnlineTransaction,
    updateTransactionDate
};

// Expose functions to window for use by non-module scripts and onclick handlers
window.validateOnlinePayment = validateOnlinePayment;
window.checkStudentHasOnlinePayments = checkStudentHasOnlinePayments;
window.checkAndAutoSelectOnlinePayment = checkAndAutoSelectOnlinePayment;
window.selectOnlineTransaction = selectOnlineTransaction;
window.showAllOnlineTransactions = showAllOnlineTransactions;
window.getSelectedOnlineTransaction = getSelectedOnlineTransaction;
window.clearSelectedOnlineTransaction = clearSelectedOnlineTransaction;
window.updateTransactionDate = updateTransactionDate;
window.showAllOnlineTransactions = showAllOnlineTransactions;
