// jest.global-setup.js
const { setupTestEnvironment } = require('./test-setup');

module.exports = async () => {
  console.log('\n🔧 Setting up test environment...\n');
  await setupTestEnvironment();
};