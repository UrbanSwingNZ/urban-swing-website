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

/**
 * Parse a date string (YYYY-MM-DD) as NZ timezone at noon
 * This avoids browser timezone issues when client sends date strings
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object at 12pm NZ time
 */
function parseDateAsNZ(dateString) {
  // Client sends YYYY-MM-DD format (e.g., "2026-02-26")
  // We need to create this at 12pm NZ time, regardless of server timezone
  
  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create ISO string for noon in NZ timezone
  // NZ is UTC+13 (NZDT) or UTC+12 (NZST)
  // We'll use NZDT offset (+13:00) for most of the year
  const noonNZ = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+13:00`);
  
  // Verify this gives us the correct date in NZ timezone
  const nzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = nzFormatter.formatToParts(noonNZ);
  const verifyDay = parts.find(p => p.type === 'day').value;
  
  // If day matches, we used the correct offset
  if (verifyDay === String(day).padStart(2, '0')) {
    return noonNZ;
  }
  
  // Otherwise try NZST offset (+12:00)
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+12:00`);
}

module.exports = {
  determineTransactionType,
  parseDateAsNZ
};
