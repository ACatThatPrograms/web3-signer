// jest.setup.js

// CORRECT (CommonJS require)
const { TextEncoder, TextDecoder } = require('util');

Object.assign(global, { TextEncoder, TextDecoder });global.TextEncoder = TextEncoder;

// Also add crypto if missing (for older Node versions)
if (typeof global.crypto === 'undefined') {
  const crypto = require('crypto');
  global.crypto = {
    getRandomValues: (arr) => {
      const bytes = crypto.randomBytes(arr.length);
      for (let i = 0; i < arr.length; i++) {
        arr[i] = bytes[i];
      }
      return arr;
    },
    randomUUID: () => crypto.randomUUID()
  };
}

// Extend Jest matchers if needed
expect.extend({
  toBeValidEthereumAddress(received) {
    const pass = /^0x[a-fA-F0-9]{40}$/.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid Ethereum address`
          : `Expected ${received} to be a valid Ethereum address`
    };
  }
});

// Set test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  // Keep log and info for debugging
  log: console.log,
  info: console.info
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});