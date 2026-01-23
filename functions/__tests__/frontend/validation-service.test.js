/**
 * Tests for student-portal/prepay/validation-service.js
 * Frontend validation logic for prepay date validation and duplicate detection
 */

// Mock window object
global.window = {};

// Mock Firebase Web SDK
const mockGet = jest.fn();
const mockWhere = jest.fn(() => ({
    get: mockGet
}));
const mockCollection = jest.fn(() => ({
    where: mockWhere
}));

global.firebase = {
    firestore: () => ({
        collection: mockCollection
    })
};

// Mock normalizeDate function (used in source file)
global.normalizeDate = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

// Load the source file (add conditional exports to validation-service.js first)
const ValidationService = require('../../../student-portal/prepay/validation-service.js');

describe('ValidationService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ValidationService();
    });

    describe('isThursday', () => {
        it('should return true for Thursday', () => {
            // January 23, 2025 is a Thursday
            const thursday = new Date(2025, 0, 23);
            expect(service.isThursday(thursday)).toBe(true);
        });

        it('should return false for Wednesday', () => {
            const wednesday = new Date(2025, 0, 22);
            expect(service.isThursday(wednesday)).toBe(false);
        });

        it('should return false for Friday', () => {
            const friday = new Date(2025, 0, 24);
            expect(service.isThursday(friday)).toBe(false);
        });

        it('should return false for Sunday', () => {
            const sunday = new Date(2025, 0, 26);
            expect(service.isThursday(sunday)).toBe(false);
        });
    });

    describe('isPastDate', () => {
        beforeEach(() => {
            // Mock current date to January 23, 2025
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2025, 0, 23, 14, 30)); // 2:30 PM
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return false for today', () => {
            const today = new Date(2025, 0, 23);
            expect(service.isPastDate(today)).toBe(false);
        });

        it('should return false for future date', () => {
            const future = new Date(2025, 0, 30);
            expect(service.isPastDate(future)).toBe(false);
        });

        it('should return true for past date', () => {
            const past = new Date(2025, 0, 16);
            expect(service.isPastDate(past)).toBe(true);
        });

        it('should normalize time and only compare dates', () => {
            // Same day but earlier time should not be considered past
            const todayEarlyMorning = new Date(2025, 0, 23, 6, 0);
            expect(service.isPastDate(todayEarlyMorning)).toBe(false);
        });
    });

    describe('validateClassDate', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date(2025, 0, 23, 14, 30)); // Thursday, January 23, 2025
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should reject null date', async () => {
            const result = await service.validateClassDate(null, 'student123');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Please select a class date.');
        });

        it('should reject undefined date', async () => {
            const result = await service.validateClassDate(undefined, 'student123');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Please select a class date.');
        });

        it('should reject past date', async () => {
            const pastDate = new Date(2025, 0, 16); // Past Thursday
            const result = await service.validateClassDate(pastDate, 'student123');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Please select a current or future date.');
        });

        it('should reject non-Thursday date', async () => {
            const friday = new Date(2025, 0, 31); // Future Friday
            const result = await service.validateClassDate(friday, 'student123');
            expect(result.isValid).toBe(false);
            expect(result.message).toBe('Please select a Thursday. Classes are only held on Thursdays.');
        });

        it('should accept future Thursday with no duplicate', async () => {
            mockGet.mockResolvedValueOnce({ docs: [] }); // No existing transactions

            const futureThursday = new Date(2025, 0, 30);
            const result = await service.validateClassDate(futureThursday, 'student123');

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('');
        });

        it('should reject future Thursday with duplicate', async () => {
            // Mock existing transaction
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'txn123',
                    data: () => ({
                        type: 'casual',
                        classDate: { toDate: () => new Date(2025, 0, 30) },
                        studentId: 'student123',
                        reversed: false
                    })
                }]
            });

            const futureThursday = new Date(2025, 0, 30);
            const result = await service.validateClassDate(futureThursday, 'student123');

            expect(result.isValid).toBe(false);
            expect(result.message).toBe('You have already pre-paid for a class on this date. Please select a different date.');
        });

        it('should accept today if it is Thursday', async () => {
            mockGet.mockResolvedValueOnce({ docs: [] });

            const today = new Date(2025, 0, 23); // Today is Thursday
            const result = await service.validateClassDate(today, 'student123');

            expect(result.isValid).toBe(true);
            expect(result.message).toBe('');
        });
    });

    describe('checkForDuplicateClass', () => {
        const testDate = new Date(2025, 0, 30); // Thursday, January 30, 2025

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return valid if no studentId provided', async () => {
            const result = await service.checkForDuplicateClass(testDate, null);
            expect(result.isValid).toBe(true);
            expect(result.hasExisting).toBe(false);
            expect(mockCollection).not.toHaveBeenCalled();
        });

        it('should return valid if no existing transactions', async () => {
            mockGet.mockResolvedValueOnce({ docs: [] });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(true);
            expect(result.hasExisting).toBe(false);
            expect(mockCollection).toHaveBeenCalledWith('transactions');
            expect(mockWhere).toHaveBeenCalledWith('studentId', '==', 'student123');
        });

        it('should detect duplicate casual transaction with classDate', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'txn123',
                    data: () => ({
                        type: 'casual',
                        classDate: { toDate: () => new Date(2025, 0, 30, 10, 0) },
                        reversed: false
                    })
                }]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(false);
            expect(result.hasExisting).toBe(true);
            expect(result.message).toContain('already pre-paid');
        });

        it('should detect duplicate casual-student transaction', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'txn456',
                    data: () => ({
                        type: 'casual-student',
                        classDate: { toDate: () => new Date(2025, 0, 30, 19, 0) },
                        reversed: false
                    })
                }]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(false);
            expect(result.hasExisting).toBe(true);
        });

        it('should use transactionDate if classDate not available (backwards compatibility)', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'txn789',
                    data: () => ({
                        type: 'casual',
                        transactionDate: { toDate: () => new Date(2025, 0, 30, 14, 30) },
                        reversed: false
                    })
                }]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(false);
            expect(result.hasExisting).toBe(true);
        });

        it('should ignore reversed transactions', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'txn_reversed',
                    data: () => ({
                        type: 'casual',
                        classDate: { toDate: () => new Date(2025, 0, 30) },
                        reversed: true
                    })
                }]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(true);
            expect(result.hasExisting).toBe(false);
        });

        it('should ignore non-casual transaction types', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'txn_package',
                        data: () => ({
                            type: '5-class',
                            classDate: { toDate: () => new Date(2025, 0, 30) },
                            reversed: false
                        })
                    },
                    {
                        id: 'txn_concession',
                        data: () => ({
                            type: 'concession',
                            classDate: { toDate: () => new Date(2025, 0, 30) },
                            reversed: false
                        })
                    }
                ]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(true);
            expect(result.hasExisting).toBe(false);
        });

        it('should ignore transactions on different dates', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [{
                    id: 'txn_other_day',
                    data: () => ({
                        type: 'casual',
                        classDate: { toDate: () => new Date(2025, 1, 6) }, // Different Thursday
                        reversed: false
                    })
                }]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            expect(result.isValid).toBe(true);
            expect(result.hasExisting).toBe(false);
        });

        it('should match transactions on same day regardless of time', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'txn_morning',
                        data: () => ({
                            type: 'casual',
                            classDate: { toDate: () => new Date(2025, 0, 30, 8, 0) }, // 8 AM
                            reversed: false
                        })
                    },
                    {
                        id: 'txn_evening',
                        data: () => ({
                            type: 'casual',
                            classDate: { toDate: () => new Date(2025, 0, 30, 22, 0) }, // 10 PM
                            reversed: false
                        })
                    }
                ]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            // Should find both transactions
            expect(result.isValid).toBe(false);
            expect(result.hasExisting).toBe(true);
        });

        it('should handle Firestore errors gracefully', async () => {
            mockGet.mockRejectedValueOnce(new Error('Network error'));

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            // Should not block user on error
            expect(result.isValid).toBe(true);
            expect(result.hasExisting).toBe(false);
            expect(result.error).toBe('Network error');
        });

        it('should handle malformed transaction documents', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'txn_no_date',
                        data: () => ({
                            type: 'casual',
                            // No classDate or transactionDate
                            reversed: false
                        })
                    },
                    {
                        id: 'txn_valid',
                        data: () => ({
                            type: 'casual',
                            classDate: { toDate: () => new Date(2025, 0, 30) },
                            reversed: false
                        })
                    }
                ]
            });

            const result = await service.checkForDuplicateClass(testDate, 'student123');

            // Should ignore malformed doc but still find valid one
            expect(result.isValid).toBe(false);
            expect(result.hasExisting).toBe(true);
        });
    });

    describe('updateValidationUI', () => {
        let mockMessageEl, mockFieldHelp, mockSubmitBtn;

        beforeEach(() => {
            // Create DOM elements
            mockMessageEl = {
                innerHTML: '',
                className: '',
                style: { display: '' }
            };
            mockFieldHelp = {
                style: { display: '' }
            };
            mockSubmitBtn = {
                disabled: false
            };

            // Mock DOM methods
            global.document = {
                getElementById: jest.fn((id) => {
                    if (id === 'date-validation-message') return mockMessageEl;
                    if (id === 'submit-btn') return mockSubmitBtn;
                    return null;
                }),
                querySelector: jest.fn((selector) => {
                    if (selector === '.field-help') return mockFieldHelp;
                    return null;
                })
            };
        });

        afterEach(() => {
            delete global.document;
        });

        it('should display error message when invalid', () => {
            service.updateValidationUI(false, 'Please select a Thursday');

            expect(mockMessageEl.innerHTML).toContain('fa-exclamation-circle');
            expect(mockMessageEl.innerHTML).toContain('Please select a Thursday');
            expect(mockMessageEl.className).toBe('validation-message error');
            expect(mockMessageEl.style.display).toBe('block');
            expect(mockFieldHelp.style.display).toBe('none');
        });

        it('should clear error message when valid', () => {
            service.updateValidationUI(true, '');

            expect(mockMessageEl.style.display).toBe('none');
            expect(mockFieldHelp.style.display).toBe('block');
        });

        it('should handle missing message element gracefully', () => {
            global.document.getElementById = jest.fn(() => null);

            // Should not throw error
            expect(() => {
                service.updateValidationUI(false, 'Error message');
            }).not.toThrow();
        });

        it('should handle missing field help element gracefully', () => {
            global.document.querySelector = jest.fn(() => null);

            // Should not throw error
            expect(() => {
                service.updateValidationUI(true, '');
            }).not.toThrow();
        });

        it('should accept custom element IDs', () => {
            const customMessageEl = {
                innerHTML: '',
                className: '',
                style: { display: '' }
            };
            const customFieldHelp = {
                style: { display: '' }
            };

            global.document.getElementById = jest.fn((id) => {
                if (id === 'custom-message') return customMessageEl;
                return null;
            });
            global.document.querySelector = jest.fn((selector) => {
                if (selector === '.custom-help') return customFieldHelp;
                return null;
            });

            service.updateValidationUI(
                false,
                'Custom error',
                'custom-message',
                'custom-submit',
                'custom-help'
            );

            expect(customMessageEl.innerHTML).toContain('Custom error');
            expect(customFieldHelp.style.display).toBe('none');
        });
    });
});
