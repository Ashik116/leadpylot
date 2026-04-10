#!/usr/bin/env node
/**
 * Quick test script for Search Service
 * Run: node test-search.js
 */

const axios = require('axios');

const SEARCH_SERVICE_URL = 'http://localhost:3010/api/search';

// You'll need a valid JWT token - get it from login or use an existing one
const TEST_TOKEN = process.env.TEST_TOKEN || 'YOUR_TOKEN_HERE';

const tests = [
  {
    name: 'Test 1: Count all Leads',
    payload: {
      model: 'Lead',
      domain: [],
      limit: 5
    }
  },
  {
    name: 'Test 2: Filter Leads by Status',
    payload: {
      model: 'Lead',
      domain: [
        ['status', '=', 'new']
      ],
      limit: 5
    }
  },
  {
    name: 'Test 3: Search by Contact Name (ilike)',
    payload: {
      model: 'Lead',
      domain: [
        ['contact_name', 'ilike', 'a']
      ],
      limit: 5
    }
  },
  {
    name: 'Test 4: Group Leads by Status',
    payload: {
      model: 'Lead',
      domain: [],
      groupBy: ['status']
    }
  },
  {
    name: 'Test 5: Count all Offers',
    payload: {
      model: 'Offer',
      domain: [],
      limit: 5
    }
  },
  {
    name: 'Test 6: Group Offers by Stage',
    payload: {
      model: 'Offer',
      domain: [],
      groupBy: ['stage_id']
    }
  },
  {
    name: 'Test 7: Auto-Join - Filter by User Name',
    payload: {
      model: 'Lead',
      domain: [
        ['user_id.login', 'ilike', 'admin']
      ],
      limit: 3
    }
  }
];

async function runTests() {
  console.log('🔍 Search Service Test Suite\n');
  console.log('=' .repeat(60));

  if (TEST_TOKEN === 'YOUR_TOKEN_HERE') {
    console.log('⚠️  No token provided. Set TEST_TOKEN env var or edit script.');
    console.log('   Example: TEST_TOKEN=your_jwt_token node test-search.js\n');
    console.log('Running WITHOUT auth (will fail if auth is required)...\n');
  }

  for (const test of tests) {
    try {
      console.log(`\n📊 ${test.name}`);
      console.log('   Request:', JSON.stringify(test.payload, null, 2));

      const headers = TEST_TOKEN !== 'YOUR_TOKEN_HERE' 
        ? { Authorization: `Bearer ${TEST_TOKEN}` }
        : {};

      const response = await axios.post(SEARCH_SERVICE_URL, test.payload, { headers });

      console.log('   ✅ Success!');
      console.log('   Results:', response.data.data.length, 'records');
      
      if (response.data.data.length > 0) {
        console.log('   Sample:', JSON.stringify(response.data.data[0], null, 2).substring(0, 200) + '...');
      }
      
      console.log('   Meta:', response.data.meta);

    } catch (error) {
      console.log('   ❌ Failed:', error.response?.data?.message || error.message);
      if (error.response?.status === 401) {
        console.log('      → Auth required. Provide TEST_TOKEN.');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test suite complete!\n');
}

runTests();

