/**
 * Tests for casual-rates-utils.js
 * Tests rate fetching, caching, and formatting logic
 * 
 * SCOPE: Behavior testing - caching logic, Firestore queries, error handling, formatting
 */

const fs = require('fs');
const path = require('path');

// Mock Firebase
const mockFirestore = {
  collection: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  get: jest.fn()
};

const mockFirebase = {
  firestore: jest.fn(() => mockFirestore)
};

global.firebase = mockFirebase;

// Mock console methods to reduce noise in tests
const originalConsole = console;
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
};

// Import the module after mocking
const {
  getCasualRates,
  getCasualRateByName,
  getStandardCasualRate,
  getStudentCasualRate,
  getCasualRatePrice,
  clearCasualRatesCache,
  formatCasualRateDisplay,
  getAllCasualRates
} = require('../../../js/casual-rates-utils.js');

describe('casual-rates-utils', () => {
  let mockQueryChain;
  let mockSnapshot;

  const testRates = [
    {
      id: 'casual-standard',
      name: 'Casual Entry',
      price: 15,
      isActive: true,
      isPromo: false,
      displayOrder: 1
    },
    {
      id: 'casual-student',
      name: 'Student Casual Entry',
      price: 12,
      isActive: true,
      isPromo: false,
      displayOrder: 2
    },
    {
      id: 'casual-promo',
      name: 'Promo Casual Entry',
      price: 10,
      isActive: true,
      isPromo: true,
      displayOrder: 3
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear the cache before each test
    if (clearCasualRatesCache) {
      clearCasualRatesCache();
    }

    // Setup mock Firestore query chain
    mockSnapshot = {
      forEach: jest.fn((callback) => {
        testRates.forEach(rate => {
          callback({
            id: rate.id,
            data: () => {
              const { id, ...data } = rate;
              return data;
            }
          });
        });
      })
    };

    mockQueryChain = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockSnapshot)
    };

    mockFirestore.collection.mockReturnValue(mockQueryChain);
  });

  describe('getCasualRates', () => {
    test('should fetch rates from Firestore on first call', async () => {
      const rates = await getCasualRates();

      expect(mockFirestore.collection).toHaveBeenCalledWith('casualRates');
      expect(mockQueryChain.where).toHaveBeenCalledWith('isActive', '==', true);
      expect(mockQueryChain.orderBy).toHaveBeenCalledWith('displayOrder', 'asc');
      expect(rates).toEqual(testRates);
      expect(rates.length).toBe(3);
    });

    test('should return cached rates on second call', async () => {
      // First call - should fetch from Firestore
      const rates1 = await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const rates2 = await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(rates2).toEqual(rates1);
    });

    test('should refresh cache when forceRefresh is true', async () => {
      // First call
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // Force refresh
      await getCasualRates(true);
      expect(mockQueryChain.get).toHaveBeenCalledTimes(2);
    });

    test('should refresh cache after 5 minutes', async () => {
      // First call
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // Mock time passing (5 minutes + 1 second)
      const realDateNow = Date.now;
      const fiveMinutesAgo = Date.now();
      Date.now = jest.fn(() => fiveMinutesAgo + (5 * 60 * 1000) + 1000);

      // Second call - should fetch again
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(2);

      // Restore Date.now
      Date.now = realDateNow;
    });

    test('should return expired cache if Firestore fails', async () => {
      // First successful call to populate cache
      const rates1 = await getCasualRates();

      // Second call fails
      mockQueryChain.get.mockRejectedValueOnce(new Error('Network error'));

      const rates2 = await getCasualRates(true);
      expect(rates2).toEqual(rates1);
      expect(console.warn).toHaveBeenCalledWith('Using expired cache due to error');
    });

    test('should throw error if Firestore fails and no cache exists', async () => {
      mockQueryChain.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(getCasualRates()).rejects.toThrow('Network error');
    });

    test('should include document ID in returned rate objects', async () => {
      const rates = await getCasualRates();

      rates.forEach((rate, index) => {
        expect(rate.id).toBe(testRates[index].id);
      });
    });
  });

  describe('getCasualRateByName', () => {
    test('should return rate matching the name', async () => {
      const rate = await getCasualRateByName('Casual Entry');

      expect(rate).toEqual(testRates[0]);
      expect(rate.name).toBe('Casual Entry');
      expect(rate.price).toBe(15);
    });

    test('should return rate for student entry', async () => {
      const rate = await getCasualRateByName('Student Casual Entry');

      expect(rate).toEqual(testRates[1]);
      expect(rate.price).toBe(12);
    });

    test('should return null if rate not found', async () => {
      const rate = await getCasualRateByName('Nonexistent Rate');

      expect(rate).toBeNull();
    });

    test('should be case-sensitive', async () => {
      const rate = await getCasualRateByName('casual entry'); // lowercase

      expect(rate).toBeNull();
    });
  });

  describe('getStandardCasualRate', () => {
    test('should return non-student, non-promo rate', async () => {
      const rate = await getStandardCasualRate();

      expect(rate.name).toBe('Casual Entry');
      expect(rate.price).toBe(15);
      expect(rate.isPromo).toBe(false);
      expect(rate.name).not.toContain('Student');
    });

    test('should exclude rates with "student" in name', async () => {
      const rate = await getStandardCasualRate();

      expect(rate.name.toLowerCase()).not.toContain('student');
    });

    test('should exclude promo rates', async () => {
      const rate = await getStandardCasualRate();

      expect(rate.isPromo).toBe(false);
    });

    test('should return first rate if no standard rate found', async () => {
      // Mock only student and promo rates
      const specialRates = [
        {
          id: 'student-only',
          name: 'Student Casual Entry',
          price: 12,
          isActive: true,
          isPromo: false,
          displayOrder: 1
        }
      ];

      mockSnapshot.forEach = jest.fn((callback) => {
        specialRates.forEach(rate => {
          callback({
            id: rate.id,
            data: () => {
              const { id, ...data } = rate;
              return data;
            }
          });
        });
      });

      const rate = await getStandardCasualRate();

      expect(rate.id).toBe('student-only');
    });

    test('should return null if no rates exist', async () => {
      mockSnapshot.forEach = jest.fn((callback) => {
        // No rates
      });

      const rate = await getStandardCasualRate();

      expect(rate).toBeNull();
    });
  });

  describe('getStudentCasualRate', () => {
    test('should return rate with "student" in name', async () => {
      const rate = await getStudentCasualRate();

      expect(rate.name).toBe('Student Casual Entry');
      expect(rate.price).toBe(12);
      expect(rate.name.toLowerCase()).toContain('student');
    });

    test('should exclude promo rates', async () => {
      const rate = await getStudentCasualRate();

      expect(rate.isPromo).toBe(false);
    });

    test('should be case-insensitive for "student"', async () => {
      const ratesWithVariations = [
        {
          id: 'rate1',
          name: 'STUDENT Entry',
          price: 12,
          isActive: true,
          isPromo: false,
          displayOrder: 1
        }
      ];

      mockSnapshot.forEach = jest.fn((callback) => {
        ratesWithVariations.forEach(rate => {
          callback({
            id: rate.id,
            data: () => {
              const { id, ...data } = rate;
              return data;
            }
          });
        });
      });

      const rate = await getStudentCasualRate();

      expect(rate.name).toBe('STUDENT Entry');
    });

    test('should return null if no student rate exists', async () => {
      mockSnapshot.forEach = jest.fn((callback) => {
        [testRates[0]].forEach(rate => { // Only standard rate
          callback({
            id: rate.id,
            data: () => {
              const { id, ...data } = rate;
              return data;
            }
          });
        });
      });

      const rate = await getStudentCasualRate();

      expect(rate).toBeNull();
    });
  });

  describe('getCasualRatePrice', () => {
    test('should return price for existing rate', async () => {
      const price = await getCasualRatePrice('Casual Entry');

      expect(price).toBe(15);
    });

    test('should return price for student rate', async () => {
      const price = await getCasualRatePrice('Student Casual Entry');

      expect(price).toBe(12);
    });

    test('should return default price if rate not found', async () => {
      const price = await getCasualRatePrice('Nonexistent Rate');

      expect(price).toBe(15); // default
    });

    test('should return custom default price', async () => {
      const price = await getCasualRatePrice('Nonexistent Rate', 20);

      expect(price).toBe(20);
    });

    test('should return default price on error', async () => {
      mockQueryChain.get.mockRejectedValueOnce(new Error('Network error'));

      const price = await getCasualRatePrice('Casual Entry', 18);

      expect(price).toBe(18);
      expect(console.error).toHaveBeenCalledWith('Error getting casual rate price:', expect.any(Error));
    });
  });

  describe('formatCasualRateDisplay', () => {
    test('should format rate with name and price', () => {
      const formatted = formatCasualRateDisplay(testRates[0]);

      expect(formatted).toBe('Casual Entry ($15.00)');
    });

    test('should format decimal prices correctly', () => {
      const rate = { name: 'Test Rate', price: 12.5 };
      const formatted = formatCasualRateDisplay(rate);

      expect(formatted).toBe('Test Rate ($12.50)');
    });

    test('should return default text if rate is null', () => {
      const formatted = formatCasualRateDisplay(null);

      expect(formatted).toBe('Casual Entry');
    });

    test('should return default text if rate is undefined', () => {
      const formatted = formatCasualRateDisplay(undefined);

      expect(formatted).toBe('Casual Entry');
    });

    test('should format whole number prices with two decimal places', () => {
      const rate = { name: 'Round Price', price: 20 };
      const formatted = formatCasualRateDisplay(rate);

      expect(formatted).toBe('Round Price ($20.00)');
    });
  });

  describe('getAllCasualRates', () => {
    test('should fetch all rates without filtering by isActive', async () => {
      const allRates = [
        ...testRates,
        {
          id: 'inactive-rate',
          name: 'Inactive Rate',
          price: 8,
          isActive: false,
          isPromo: false,
          displayOrder: 4
        }
      ];

      mockSnapshot.forEach = jest.fn((callback) => {
        allRates.forEach(rate => {
          callback({
            id: rate.id,
            data: () => {
              const { id, ...data } = rate;
              return data;
            }
          });
        });
      });

      const rates = await getAllCasualRates();

      expect(mockFirestore.collection).toHaveBeenCalledWith('casualRates');
      expect(mockQueryChain.where).not.toHaveBeenCalled(); // No filtering
      expect(mockQueryChain.orderBy).toHaveBeenCalledWith('displayOrder', 'asc');
      expect(rates.length).toBe(4);
    });

    test('should throw error on Firestore failure', async () => {
      mockQueryChain.get.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(getAllCasualRates()).rejects.toThrow('Permission denied');
      expect(console.error).toHaveBeenCalledWith('Error fetching all casual rates:', expect.any(Error));
    });

    test('should include inactive rates', async () => {
      const allRates = [
        {
          id: 'active-rate',
          name: 'Active Rate',
          price: 15,
          isActive: true,
          isPromo: false,
          displayOrder: 1
        },
        {
          id: 'inactive-rate',
          name: 'Inactive Rate',
          price: 10,
          isActive: false,
          isPromo: false,
          displayOrder: 2
        }
      ];

      mockSnapshot.forEach = jest.fn((callback) => {
        allRates.forEach(rate => {
          callback({
            id: rate.id,
            data: () => {
              const { id, ...data } = rate;
              return data;
            }
          });
        });
      });

      const rates = await getAllCasualRates();

      expect(rates.some(r => r.isActive === false)).toBe(true);
    });
  });

  describe('clearCasualRatesCache', () => {
    test('should clear cache and force new fetch', async () => {
      // First call - populates cache
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // Clear cache
      clearCasualRatesCache();

      // Third call - should fetch again
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(2);
    });

    test('should log cache cleared message', () => {
      clearCasualRatesCache();

      expect(console.log).toHaveBeenCalledWith('Casual rates cache cleared');
    });
  });

  describe('Cache Behavior', () => {
    test('should cache rates for 5 minutes', async () => {
      const realDateNow = Date.now;
      const startTime = 1000000;
      Date.now = jest.fn(() => startTime);

      // First call
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // 4 minutes 59 seconds later - still cached
      Date.now = jest.fn(() => startTime + (4 * 60 * 1000) + 59000);
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // 5 minutes 1 second later - cache expired
      Date.now = jest.fn(() => startTime + (5 * 60 * 1000) + 1000);
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(2);

      Date.now = realDateNow;
    });

    test('should use cached data across different getter functions', async () => {
      // First call populates cache
      await getCasualRates();
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);

      // Other functions should use cache
      await getCasualRateByName('Casual Entry');
      await getStandardCasualRate();
      await getStudentCasualRate();

      // Still only 1 Firestore call
      expect(mockQueryChain.get).toHaveBeenCalledTimes(1);
    });
  });
});
