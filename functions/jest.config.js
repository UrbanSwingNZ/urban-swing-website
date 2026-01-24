module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/test-helpers/'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!index.js',
    '!jest.config.js',
    '!.eslintrc.js',
    '!coverage/**',
    '!node_modules/**',
    '!__tests__/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 30000, // Increased for integration tests with emulator
  // Run tests serially for integration tests to avoid conflicts
  maxWorkers: process.env.INTEGRATION_TESTS ? 1 : undefined,
};
