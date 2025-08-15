#!/usr/bin/env node

/**
 * Test script for the analyze endpoint
 * Run with: node scripts/test-analyze.js
 */

const https = require('https');
const http = require('http');

// Test configuration
const HOST = 'localhost';
const PORT = 3000;
const TEST_TEXT = 'This is a comprehensive test text that needs to be analyzed. It contains enough characters to meet the minimum requirement for analysis. The text should trigger the analysis endpoint and return proper results. We need to ensure that the authentication is working correctly and that the xAI integration is functional. This test will help us debug any issues with the analyze functionality.';

// Function to make HTTP request
function makeRequest(path, method = 'GET', body = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (cookies) {
      options.headers['Cookie'] = cookies;
    }
    
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('=== Testing Analyze Endpoint ===\n');
  
  try {
    // Test 1: Check session endpoint
    console.log('1. Testing session endpoint...');
    const sessionResponse = await makeRequest('/api/auth/session');
    console.log('   Status:', sessionResponse.status);
    
    let sessionData;
    try {
      sessionData = JSON.parse(sessionResponse.body);
      console.log('   Session data:', sessionData);
    } catch (e) {
      console.log('   Raw response:', sessionResponse.body);
    }
    
    // Test 2: Test analyze endpoint without auth
    console.log('\n2. Testing analyze endpoint without authentication...');
    const analyzeNoAuth = await makeRequest('/api/analyze/stream', 'POST', {
      text: TEST_TEXT,
      title: 'Test Analysis - No Auth'
    });
    console.log('   Status:', analyzeNoAuth.status);
    console.log('   Response (first 200 chars):', analyzeNoAuth.body.substring(0, 200));
    
    // Test 3: Test regular analyze endpoint
    console.log('\n3. Testing regular analyze endpoint...');
    const regularAnalyze = await makeRequest('/api/analyze', 'POST', {
      text: TEST_TEXT,
      title: 'Test Analysis - Regular'
    });
    console.log('   Status:', regularAnalyze.status);
    
    let regularData;
    try {
      regularData = JSON.parse(regularAnalyze.body);
      console.log('   Response:', {
        error: regularData.error,
        details: regularData.details,
        requestId: regularData.requestId
      });
    } catch (e) {
      console.log('   Raw response (first 200 chars):', regularAnalyze.body.substring(0, 200));
    }
    
    // Instructions for manual testing
    console.log('\n=== Manual Testing Instructions ===');
    console.log('1. Open your browser and go to http://localhost:3000');
    console.log('2. Log in to your account');
    console.log('3. Open the browser console (F12)');
    console.log('4. Run: document.cookie to see all cookies');
    console.log('5. Look for cookies starting with "sb-" - these are Supabase auth cookies');
    console.log('6. Try the analyze feature from the UI');
    console.log('\nIf authentication is failing:');
    console.log('- Ensure you are logged in');
    console.log('- Check that cookies are being set');
    console.log('- Clear browser cache and cookies, then log in again');
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run tests
runTests();