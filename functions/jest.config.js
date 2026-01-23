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
  testTimeout: 10000
};
