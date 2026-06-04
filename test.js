const http = require('http');

const tests = [
  { method: 'GET', path: '/', name: 'Home Page' },
  { method: 'GET', path: '/auth/register', name: 'Register Page' },
  { method: 'GET', path: '/auth/login', name: 'Login Page' },
  { method: 'GET', path: '/items/search', name: 'Search Page' },
  { method: 'GET', path: '/dashboard', name: 'Dashboard (protected)' },
];

let passed = 0;
let failed = 0;

async function runTests() {
  console.log('\n🧪 Running Lost2Found Tests...\n');
  
  for (const test of tests) {
    await testEndpoint(test);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50) + '\n');
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Project is running correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check output above.');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

function testEndpoint(test) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: test.path,
      method: test.method,
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 400;
      
      if (isSuccess) {
        console.log(`✓ ${test.name.padEnd(30)} [${statusCode}]`);
        passed++;
      } else {
        console.log(`✗ ${test.name.padEnd(30)} [${statusCode}]`);
        failed++;
      }
      
      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', (error) => {
      console.log(`✗ ${test.name.padEnd(30)} [ERROR: ${error.message}]`);
      failed++;
      resolve();
    });

    req.on('timeout', () => {
      console.log(`✗ ${test.name.padEnd(30)} [TIMEOUT]`);
      failed++;
      req.destroy();
      resolve();
    });

    req.end();
  });
}

// Wait a moment for server to be ready
setTimeout(runTests, 1000);
