#!/usr/bin/env node

// Simple test script to verify authentication endpoints
const http = require('http');

const baseUrl = 'http://127.0.0.1:5000';

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AuthTest/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Authentication Endpoints\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await testEndpoint('/api/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${health.body}\n`);

    // Test auth user endpoint (should return 401)
    console.log('2. Testing auth user endpoint (no session)...');
    const authUser = await testEndpoint('/api/auth/user');
    console.log(`   Status: ${authUser.status}`);
    console.log(`   Response: ${authUser.body}\n`);

    // Test Google OAuth initiation
    console.log('3. Testing Google OAuth initiation...');
    const googleAuth = await testEndpoint('/api/auth/google');
    console.log(`   Status: ${googleAuth.status}`);
    console.log(`   Headers: ${JSON.stringify(googleAuth.headers, null, 2)}\n`);

    // Test login endpoint
    console.log('4. Testing login endpoint...');
    const login = await testEndpoint('/api/login');
    console.log(`   Status: ${login.status}`);
    console.log(`   Response: ${login.body}\n`);

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();