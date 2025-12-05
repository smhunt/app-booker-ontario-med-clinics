module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/server.ts'
  ],
  // TODO: Increase coverage thresholds as more tests are added
  // Target: 80% statements, 75% branches, 80% lines, 80% functions
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 7,
      lines: 6,
      statements: 6
    }
  }
};
