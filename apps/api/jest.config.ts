// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
roots: ['<rootDir>/src'],  
testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 10000,
  verbose: true,
  // Ignore specific files/folders
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  // Module name mapper for path aliases if you use them
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1'
  },
  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js'
};