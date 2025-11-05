/**
 * transaction-utils.js
 * Utility functions for transaction handling
 */

/**
 * Determine transaction type based on package information
 * @param {Object} packageInfo - Package information from fetchPricing
 * @param {string} packageInfo.type - Package type ('casual-rate' or 'concession-package')
 * @param {string} packageId - Package document ID
 * @returns {string} Transaction type ('casual', 'casual-student', or 'concession-purchase')
 */
function determineTransactionType(packageInfo, packageId) {
  if (packageInfo.type === 'concession-package') {
    return 'concession-purchase';
  } else if (packageInfo.type === 'casual-rate') {
    // Check packageId to distinguish casual vs casual-student
    // Common casual-student IDs: 'casual-student', 'casual-student-price', 'student-casual-entry'
    const packageIdLower = packageId.toLowerCase();
    if (packageIdLower.includes('student')) {
      return 'casual-student';
    } else {
      return 'casual';
    }
  } else {
    // Fallback
    return 'concession-purchase';
  }
}

module.exports = {
  determineTransactionType
};
