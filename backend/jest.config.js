module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  testMatch: ['**/*.test.js'],
  verbose: true,
  testTimeout: 10000,
  maxWorkers: 1,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
};