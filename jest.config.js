module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/tests/unittests/**/*.test.js'
  ],
  modulePaths: [
    '<rootDir>/functions/node_modules'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/test-helpers/'
  ],
  collectCoverageFrom: [
    'functions/**/*.js',
    '!functions/index.js',
    '!functions/.eslintrc.js',
    '!functions/coverage/**',
    '!functions/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/unittests/setup.js'],
  testTimeout: 10000
};
