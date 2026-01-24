/**
 * Test Data for Integration Tests
 */

const casualRates = {
  'casual-standard': {
    id: 'casual-standard',
    name: 'Casual - Standard',
    price: 22,
    isActive: true,
    isPromo: false,
    order: 1,
  },
  'casual-student': {
    id: 'casual-student',
    name: 'Casual - Student',
    price: 18,
    isActive: true,
    isPromo: false,
    order: 2,
  },
};

const concessionPackages = {
  '5-class': {
    id: '5-class',
    name: '5 Class Package',
    price: 100,
    numberOfClasses: 5,
    expiryMonths: 3,
    isActive: true,
    isPromo: false,
    displayOrder: 1,
  },
  '10-class': {
    id: '10-class',
    name: '10 Class Package',
    price: 180,
    numberOfClasses: 10,
    expiryMonths: 6,
    isActive: true,
    isPromo: false,
    displayOrder: 2,
  },
};

const testUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

const testStudent = {
  'test-student-456': {
    firstName: 'Jane',
    lastName: 'Student',
    email: 'jane@example.com',
    studentId: 'STU-12345',
    concessions: {
      classes: 5,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    },
  },
};

module.exports = {
  casualRates,
  concessionPackages,
  testUser,
  testStudent,
};
