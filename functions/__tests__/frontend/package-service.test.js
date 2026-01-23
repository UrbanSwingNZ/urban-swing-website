/**
 * Tests for student-portal/purchase/package-service.js
 * Service for managing concession packages
 */

// Mock Firebase Web SDK
const mockGet = jest.fn();
const mockCollection = jest.fn(() => ({
    get: mockGet
}));

global.firebase = {
    firestore: () => ({
        collection: mockCollection
    })
};

// Mock console methods
global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock formatCurrency function (used in formatPackageDescription)
global.formatCurrency = jest.fn((amount) => `$${amount.toFixed(2)}`);

// Load the source file
const PackageService = require('../../../student-portal/purchase/package-service.js');

describe('PackageService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new PackageService();
    });

    describe('constructor', () => {
        it('should initialize with empty packages array', () => {
            expect(service.packages).toEqual([]);
        });

        it('should initialize with null selected package', () => {
            expect(service.selectedPackage).toBeNull();
        });
    });

    describe('loadPackages', () => {
        it('should load active non-promo packages from Firestore', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: '5 Class Package',
                        numberOfClasses: 5,
                        price: 75,
                        expiryMonths: 3,
                        displayOrder: 1,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: '10 Class Package',
                        numberOfClasses: 10,
                        price: 140,
                        expiryMonths: 6,
                        displayOrder: 2,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('pkg1');
            expect(result[1].id).toBe('pkg2');
            expect(mockCollection).toHaveBeenCalledWith('concessionPackages');
        });

        it('should filter out inactive packages', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Active Package',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'Inactive Package',
                        numberOfClasses: 10,
                        price: 140,
                        isActive: false,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Active Package');
        });

        it('should filter out promo packages', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Regular Package',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'Promo Package',
                        numberOfClasses: 8,
                        price: 100,
                        isActive: true,
                        isPromo: true
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Regular Package');
        });

        it('should treat missing isActive as active (isActive !== false)', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Package No isActive Field',
                        numberOfClasses: 5,
                        price: 75,
                        isPromo: false
                        // isActive not set
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Package No isActive Field');
        });

        it('should sort packages by displayOrder', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Third',
                        numberOfClasses: 15,
                        price: 200,
                        displayOrder: 3,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'First',
                        numberOfClasses: 5,
                        price: 75,
                        displayOrder: 1,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg3',
                    data: () => ({
                        name: 'Second',
                        numberOfClasses: 10,
                        price: 140,
                        displayOrder: 2,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result[0].name).toBe('First');
            expect(result[1].name).toBe('Second');
            expect(result[2].name).toBe('Third');
        });

        it('should default displayOrder to 0 if not provided', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'No Display Order',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                        // displayOrder not set
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'Has Display Order',
                        numberOfClasses: 10,
                        price: 140,
                        displayOrder: 1,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result[0].displayOrder).toBe(0);
            expect(result[1].displayOrder).toBe(1);
        });

        it('should return empty array when no packages found', async () => {
            mockGet.mockResolvedValueOnce({
                empty: true
            });

            const result = await service.loadPackages();

            expect(result).toEqual([]);
            expect(console.warn).toHaveBeenCalledWith('No concession packages found');
        });

        it('should throw error on Firestore failure', async () => {
            const error = new Error('Firestore error');
            mockGet.mockRejectedValueOnce(error);

            await expect(service.loadPackages()).rejects.toThrow('Firestore error');
            expect(console.error).toHaveBeenCalledWith('Error loading concession packages:', error);
        });

        it('should store packages in service instance', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: '5 Class',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();

            expect(service.packages).toHaveLength(1);
            expect(service.packages[0].name).toBe('5 Class');
        });

        it('should extract only required fields', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Test Package',
                        numberOfClasses: 5,
                        price: 75,
                        expiryMonths: 3,
                        displayOrder: 1,
                        isActive: true,
                        isPromo: false,
                        extraField: 'should not be included',
                        anotherField: 'also not included'
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            const result = await service.loadPackages();

            expect(result[0]).toEqual({
                id: 'pkg1',
                name: 'Test Package',
                numberOfClasses: 5,
                price: 75,
                expiryMonths: 3,
                displayOrder: 1
            });
        });

        it('should log loading message', async () => {
            mockGet.mockResolvedValueOnce({ empty: true });

            await service.loadPackages();

            expect(console.log).toHaveBeenCalledWith('Loading concession packages...');
        });
    });

    describe('getPackages', () => {
        it('should return empty array initially', () => {
            const result = service.getPackages();
            expect(result).toEqual([]);
        });

        it('should return loaded packages', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Test',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();
            const result = service.getPackages();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test');
        });

        it('should return reference to packages array', async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Test',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();
            const packages1 = service.getPackages();
            const packages2 = service.getPackages();

            expect(packages1).toBe(packages2); // Same reference
        });
    });

    describe('getPackageById', () => {
        beforeEach(async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Package 1',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'Package 2',
                        numberOfClasses: 10,
                        price: 140,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();
        });

        it('should return package by ID', () => {
            const result = service.getPackageById('pkg1');
            
            expect(result).not.toBeNull();
            expect(result.id).toBe('pkg1');
            expect(result.name).toBe('Package 1');
        });

        it('should return null for non-existent ID', () => {
            const result = service.getPackageById('non-existent');
            expect(result).toBeNull();
        });

        it('should return null for null ID', () => {
            const result = service.getPackageById(null);
            expect(result).toBeNull();
        });

        it('should return null for undefined ID', () => {
            const result = service.getPackageById(undefined);
            expect(result).toBeNull();
        });

        it('should return null for empty string ID', () => {
            const result = service.getPackageById('');
            expect(result).toBeNull();
        });

        it('should distinguish between similar IDs', () => {
            const result1 = service.getPackageById('pkg1');
            const result2 = service.getPackageById('pkg2');
            
            expect(result1.name).toBe('Package 1');
            expect(result2.name).toBe('Package 2');
        });
    });

    describe('selectPackage', () => {
        beforeEach(async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Package 1',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();
        });

        it('should select package by ID', () => {
            const result = service.selectPackage('pkg1');
            
            expect(result).not.toBeNull();
            expect(result.id).toBe('pkg1');
        });

        it('should store selected package', () => {
            service.selectPackage('pkg1');
            
            expect(service.selectedPackage).not.toBeNull();
            expect(service.selectedPackage.id).toBe('pkg1');
        });

        it('should return null for non-existent package', () => {
            const result = service.selectPackage('non-existent');
            expect(result).toBeNull();
        });

        it('should clear selection when passed null', () => {
            service.selectPackage('pkg1');
            expect(service.selectedPackage).not.toBeNull();
            
            service.selectPackage(null);
            expect(service.selectedPackage).toBeNull();
        });

        it('should clear selection when passed undefined', () => {
            service.selectPackage('pkg1');
            expect(service.selectedPackage).not.toBeNull();
            
            service.selectPackage(undefined);
            expect(service.selectedPackage).toBeNull();
        });

        it('should clear selection when passed empty string', () => {
            service.selectPackage('pkg1');
            expect(service.selectedPackage).not.toBeNull();
            
            service.selectPackage('');
            expect(service.selectedPackage).toBeNull();
        });

        it('should update selection when selecting different package', () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Package 1',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'Package 2',
                        numberOfClasses: 10,
                        price: 140,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            service.loadPackages().then(() => {
                service.selectPackage('pkg1');
                expect(service.selectedPackage.id).toBe('pkg1');
                
                service.selectPackage('pkg2');
                expect(service.selectedPackage.id).toBe('pkg2');
            });
        });
    });

    describe('getSelectedPackage', () => {
        beforeEach(async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Package 1',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();
        });

        it('should return null initially', () => {
            expect(service.getSelectedPackage()).toBeNull();
        });

        it('should return selected package', () => {
            service.selectPackage('pkg1');
            
            const result = service.getSelectedPackage();
            expect(result).not.toBeNull();
            expect(result.id).toBe('pkg1');
        });

        it('should return null after clearing selection', () => {
            service.selectPackage('pkg1');
            service.selectPackage(null);
            
            expect(service.getSelectedPackage()).toBeNull();
        });
    });

    describe('clearSelection', () => {
        beforeEach(async () => {
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Package 1',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();
        });

        it('should clear selected package', () => {
            service.selectPackage('pkg1');
            expect(service.selectedPackage).not.toBeNull();
            
            service.clearSelection();
            expect(service.selectedPackage).toBeNull();
        });

        it('should not throw error when no selection exists', () => {
            expect(() => service.clearSelection()).not.toThrow();
        });

        it('should work multiple times', () => {
            service.selectPackage('pkg1');
            service.clearSelection();
            service.clearSelection(); // Second call
            
            expect(service.selectedPackage).toBeNull();
        });
    });

    describe('formatPackageDescription', () => {
        it('should format single class package', () => {
            const pkg = {
                numberOfClasses: 1,
                expiryMonths: 3,
                price: 20
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).toContain('1 class');
            expect(result).not.toContain('classes');
            expect(result).toContain('3 month');
            expect(result).toContain('$20.00');
        });

        it('should format multiple classes package', () => {
            const pkg = {
                numberOfClasses: 5,
                expiryMonths: 3,
                price: 75
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).toContain('5 classes');
            expect(result).toContain('3 months');
            expect(result).toContain('$75.00');
        });

        it('should format single month expiry', () => {
            const pkg = {
                numberOfClasses: 5,
                expiryMonths: 1,
                price: 75
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).toContain('1 month');
            expect(result).not.toContain('months');
        });

        it('should handle missing expiry months', () => {
            const pkg = {
                numberOfClasses: 5,
                price: 75
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).toContain('5 classes');
            expect(result).toContain('$75.00');
            expect(result).not.toContain('Valid for');
        });

        it('should handle zero expiry months', () => {
            const pkg = {
                numberOfClasses: 5,
                expiryMonths: 0,
                price: 75
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).not.toContain('Valid for');
        });

        it('should use bullet separators', () => {
            const pkg = {
                numberOfClasses: 5,
                expiryMonths: 3,
                price: 75
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).toMatch(/•.*•/); // Has bullet points
        });

        it('should call formatCurrency for price', () => {
            const pkg = {
                numberOfClasses: 5,
                expiryMonths: 3,
                price: 75.50
            };

            service.formatPackageDescription(pkg);
            
            expect(global.formatCurrency).toHaveBeenCalledWith(75.50);
        });

        it('should handle large numbers', () => {
            const pkg = {
                numberOfClasses: 100,
                expiryMonths: 12,
                price: 1000
            };

            const result = service.formatPackageDescription(pkg);
            
            expect(result).toContain('100 classes');
            expect(result).toContain('12 months');
        });
    });

    describe('integration - full workflow', () => {
        it('should support complete package selection workflow', async () => {
            // Load packages
            const mockDocs = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: '5 Class',
                        numberOfClasses: 5,
                        price: 75,
                        expiryMonths: 3,
                        displayOrder: 1,
                        isActive: true,
                        isPromo: false
                    })
                },
                {
                    id: 'pkg2',
                    data: () => ({
                        name: '10 Class',
                        numberOfClasses: 10,
                        price: 140,
                        expiryMonths: 6,
                        displayOrder: 2,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs.forEach(callback)
            });

            await service.loadPackages();

            // Get all packages
            const packages = service.getPackages();
            expect(packages).toHaveLength(2);

            // Select a package
            const selected = service.selectPackage('pkg2');
            expect(selected.name).toBe('10 Class');

            // Get selected package
            const current = service.getSelectedPackage();
            expect(current.id).toBe('pkg2');

            // Format description
            const description = service.formatPackageDescription(current);
            expect(description).toContain('10 classes');
            expect(description).toContain('6 months');
            expect(description).toContain('$140.00');

            // Clear selection
            service.clearSelection();
            expect(service.getSelectedPackage()).toBeNull();
        });

        it('should handle reload of packages', async () => {
            // First load
            const mockDocs1 = [
                {
                    id: 'pkg1',
                    data: () => ({
                        name: 'Old Package',
                        numberOfClasses: 5,
                        price: 75,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs1.forEach(callback)
            });

            await service.loadPackages();
            expect(service.packages).toHaveLength(1);
            expect(service.packages[0].name).toBe('Old Package');

            // Second load (different data)
            const mockDocs2 = [
                {
                    id: 'pkg2',
                    data: () => ({
                        name: 'New Package',
                        numberOfClasses: 10,
                        price: 140,
                        isActive: true,
                        isPromo: false
                    })
                }
            ];

            mockGet.mockResolvedValueOnce({
                empty: false,
                forEach: (callback) => mockDocs2.forEach(callback)
            });

            await service.loadPackages();
            expect(service.packages).toHaveLength(1);
            expect(service.packages[0].name).toBe('New Package');
        });
    });
});
