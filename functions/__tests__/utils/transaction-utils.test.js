/**
 * Tests for utils/transaction-utils.js
 */

const { determineTransactionType } = require('../../utils/transaction-utils');

describe('transaction-utils', () => {
  describe('determineTransactionType', () => {
    it('should return "concession-purchase" for concession package', () => {
      const packageInfo = {
        type: 'concession-package',
        name: '5 Classes',
        numberOfClasses: 5
      };

      const result = determineTransactionType(packageInfo, '5-class');

      expect(result).toBe('concession-purchase');
    });

    it('should return "casual-student" for student casual rate', () => {
      const packageInfo = {
        type: 'casual-rate',
        name: 'Student Casual Entry'
      };

      const result = determineTransactionType(packageInfo, 'casual-student');

      expect(result).toBe('casual-student');
    });

    it('should return "casual-student" for package ID containing "student"', () => {
      const packageInfo = {
        type: 'casual-rate',
        name: 'Casual Entry'
      };

      const result = determineTransactionType(packageInfo, 'student-casual-entry');

      expect(result).toBe('casual-student');
    });

    it('should return "casual" for standard casual rate', () => {
      const packageInfo = {
        type: 'casual-rate',
        name: 'Casual Entry'
      };

      const result = determineTransactionType(packageInfo, 'casual-standard');

      expect(result).toBe('casual');
    });

    it('should be case-insensitive for student detection', () => {
      const packageInfo = {
        type: 'casual-rate',
        name: 'Casual Entry'
      };

      const result = determineTransactionType(packageInfo, 'CASUAL-STUDENT');

      expect(result).toBe('casual-student');
    });

    it('should default to "concession-purchase" for unknown type', () => {
      const packageInfo = {
        type: 'unknown-type',
        name: 'Unknown Package'
      };

      const result = determineTransactionType(packageInfo, 'unknown-id');

      expect(result).toBe('concession-purchase');
    });

    it('should handle package ID with "student" substring correctly', () => {
      const packageInfo = {
        type: 'casual-rate',
        name: 'Special Rate'
      };

      // Package ID contains 'student' anywhere
      const result = determineTransactionType(packageInfo, 'special-student-rate');

      expect(result).toBe('casual-student');
    });

    it('should return "casual" when package ID does not contain "student"', () => {
      const packageInfo = {
        type: 'casual-rate',
        name: 'Regular Entry'
      };

      const result = determineTransactionType(packageInfo, 'regular-entry');

      expect(result).toBe('casual');
    });
  });
});
