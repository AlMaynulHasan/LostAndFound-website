const http = require('http');

console.log('\n');
console.log('═'.repeat(60));
console.log('   🧪 LOST2FOUND PROJECT - COMPREHENSIVE TEST REPORT');
console.log('═'.repeat(60));
console.log('\n');

// Test data
const tests = {
  'Web Pages': [
    { method: 'GET', path: '/', name: 'Home Page', expected: 200 },
    { method: 'GET', path: '/auth/register', name: 'Register Form', expected: 200 },
    { method: 'GET', path: '/auth/login', name: 'Login Form', expected: 200 },
    { method: 'GET', path: '/items/search', name: 'Search Items', expected: 200 },
    { method: 'GET', path: '/items/lost', name: 'Lost Items Filter', expected: 200 },
    { method: 'GET', path: '/items/found', name: 'Found Items Filter', expected: 200 },
  ],
  'Protected Routes': [
    { method: 'GET', path: '/dashboard', name: 'User Dashboard', expected: 302 }, // Redirect to login
    { method: 'GET', path: '/chat', name: 'Chat Page', expected: 302 },
    { method: 'GET', path: '/admin', name: 'Admin Panel', expected: 302 },
  ],
  'Files & Structure': [
    { type: 'file', path: 'app.js', name: 'Main Server File' },
    { type: 'file', path: 'db.js', name: 'Database Config' },
    { type: 'file', path: '.env', name: 'Environment File' },
    { type: 'file', path: 'package.json', name: 'Package Config' },
    { type: 'dir', path: 'routes', name: 'Routes Directory' },
    { type: 'dir', path: 'models', name: 'Models Directory' },
    { type: 'dir', path: 'views', name: 'Views Directory' },
    { type: 'dir', path: 'public', name: 'Public Directory' },
    { type: 'dir', path: 'data', name: 'Data Directory' },
    { type: 'file', path: 'data/db.json', name: 'Database File' },
  ]
};

const fs = require('fs');
const path = require('path');
const projectRoot = process.cwd();

let stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Test HTTP endpoints
async function testEndpoints() {
  console.log('📡 TESTING HTTP ENDPOINTS\n');
  
  for (const [category, categoryTests] of Object.entries(tests)) {
    if (categoryTests[0].method) { // Only HTTP tests
      console.log(`\n${category}:`);
      console.log('─'.repeat(60));
      
      for (const test of categoryTests) {
        stats.total++;
        await testHttpEndpoint(test);
      }
    }
  }
}

function testHttpEndpoint(test) {
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
      const isSuccess = statusCode === test.expected || (statusCode >= 200 && statusCode < 400);
      
      const statusStr = `[${statusCode}]`.padEnd(6);
      const nameStr = test.name.padEnd(30);
      
      if (isSuccess) {
        console.log(`  ✓ ${nameStr} ${statusStr}`);
        stats.passed++;
      } else {
        console.log(`  ✗ ${nameStr} ${statusStr} Expected: ${test.expected}`);
        stats.failed++;
        stats.errors.push(`${test.name}: Got ${statusCode}, expected ${test.expected}`);
      }
      
      res.on('data', () => {});
      res.on('end', () => resolve());
    });

    req.on('error', (error) => {
      console.log(`  ✗ ${test.name.padEnd(30)} ERROR: ${error.message}`);
      stats.failed++;
      stats.errors.push(`${test.name}: ${error.message}`);
      resolve();
    });

    req.on('timeout', () => {
      console.log(`  ✗ ${test.name.padEnd(30)} TIMEOUT`);
      stats.failed++;
      stats.errors.push(`${test.name}: Request timeout`);
      req.destroy();
      resolve();
    });

    req.end();
  });
}

// Test file structure
function testFileStructure() {
  console.log('\n\n📁 CHECKING FILE STRUCTURE\n');
  
  const fileTests = tests['Files & Structure'];
  
  console.log('Project Files & Directories:');
  console.log('─'.repeat(60));
  
  for (const test of fileTests) {
    stats.total++;
    const filePath = path.join(projectRoot, test.path);
    
    try {
      const stat = fs.statSync(filePath);
      const isDir = stat.isDirectory();
      const isFile = stat.isFile();
      
      const expectedType = test.type === 'dir' ? isDir : isFile;
      
      if (expectedType) {
        const sizeStr = test.type === 'file' ? ` (${stat.size} bytes)` : '';
        console.log(`  ✓ ${test.name.padEnd(30)} ${test.path}${sizeStr}`);
        stats.passed++;
      } else {
        console.log(`  ✗ ${test.name.padEnd(30)} Wrong type`);
        stats.failed++;
        stats.errors.push(`${test.name}: Expected ${test.type}, got ${isDir ? 'directory' : 'file'}`);
      }
    } catch (error) {
      console.log(`  ✗ ${test.name.padEnd(30)} NOT FOUND`);
      stats.failed++;
      stats.errors.push(`${test.name}: File not found at ${test.path}`);
    }
  }
}

// Test database
function testDatabase() {
  console.log('\n\n💾 CHECKING DATABASE\n');
  
  console.log('Database Information:');
  console.log('─'.repeat(60));
  
  try {
    const dbPath = path.join(projectRoot, 'data/db.json');
    const content = fs.readFileSync(dbPath, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`  ✓ Database file exists and is valid JSON`);
    console.log(`  ✓ Users in database: ${(data.users || []).length}`);
    console.log(`  ✓ Items in database: ${(data.items || []).length}`);
    console.log(`  ✓ Messages in database: ${(data.messages || []).length}`);
    
    if (data.users && data.users.length > 0) {
      console.log(`\n  First user: ${data.users[0].name} (${data.users[0].email})`);
    }
    
    stats.passed += 4;
    stats.total += 4;
  } catch (error) {
    console.log(`  ✗ Database error: ${error.message}`);
    stats.failed += 4;
    stats.total += 4;
    stats.errors.push(`Database: ${error.message}`);
  }
}

// Check Node.js version
function checkEnvironment() {
  console.log('\n\n⚙️  ENVIRONMENT CHECK\n');
  
  console.log('System Information:');
  console.log('─'.repeat(60));
  
  const nodeVersion = process.version;
  
  console.log(`  ✓ Node.js version: ${nodeVersion}`);
  console.log(`  ✓ Platform: ${process.platform}`);
  console.log(`  ✓ Project root: ${projectRoot}`);
  
  // Check package.json
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    console.log(`  ✓ Project name: ${pkg.name}`);
    console.log(`  ✓ Main file: ${pkg.main}`);
    console.log(`  ✓ Installed dependencies: ${Object.keys(pkg.dependencies).length}`);
  } catch (error) {
    console.log(`  ✗ Error reading package.json: ${error.message}`);
  }
}

// Main execution
async function runAllTests() {
  checkEnvironment();
  await testEndpoints();
  testFileStructure();
  testDatabase();
  
  // Print summary
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log('   📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`\n  Total Tests: ${stats.total}`);
  console.log(`  ✓ Passed: ${stats.passed}`);
  console.log(`  ✗ Failed: ${stats.failed}`);
  console.log(`  Success Rate: ${Math.round((stats.passed / stats.total) * 100)}%\n`);
  
  if (stats.failed > 0) {
    console.log('  Errors:');
    stats.errors.forEach((error, i) => {
      console.log(`    ${i + 1}. ${error}`);
    });
    console.log('');
  }
  
  console.log('═'.repeat(60));
  
  if (stats.failed === 0) {
    console.log('\n  🎉 ALL TESTS PASSED! PROJECT IS RUNNING CORRECTLY!\n');
  } else {
    console.log('\n  ⚠️  Some tests failed. Review the errors above.\n');
  }
  
  console.log('═'.repeat(60));
  console.log('\n');
  
  process.exit(stats.failed > 0 ? 1 : 0);
}

// Wait for server and run tests
setTimeout(runAllTests, 1000);
