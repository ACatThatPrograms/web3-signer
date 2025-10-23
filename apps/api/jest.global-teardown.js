// jest.global-teardown.js
const { teardownTestEnvironment } = require('./test-setup');

module.exports = async () => {
  console.log('\n🧹 Cleaning up test environment...\n');
  await teardownTestEnvironment();
};