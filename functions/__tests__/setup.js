/**
 * Jest setup file
 * Runs before all tests
 */
const path = require('path');

// Load .env file from functions directory
require('dotenv').config({ path: path.join(__dirname, '../../functions/.env') });

// Suppress console logs during tests (optional - remove if you want to see logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set test environment variables (override .env if needed)
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_fake_key_for_testing';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project';
process.env.NODE_ENV = 'test';
