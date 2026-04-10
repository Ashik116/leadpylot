/**
 * Dynamic Filtering Performance Test & Monitoring Tool
 * 
 * Tests the new dynamic filtering system and compares performance with:
 * - Old aggregation-based queries
 * - New optimized queries
 * - Dynamic filtering with various combinations
 * 
 * Usage:
 * node scripts/test-dynamic-filtering.js
 * 
 * Options:
 * --quick: Run quick tests only (< 1 minute)
 * --full: Run comprehensive tests (may take several minutes)
 * --compare: Compare with old system
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

const logger = {
  info: (...args) => console.log('ℹ️ ', ...args),
  success: (...args) => console.log('✅', ...args),
  warn: (...args) => console.warn('⚠️ ', ...args),
  error: (...args) => console.error('❌', ...args),
  test: (...args) => console.log('🧪', ...args),
  perf: (...args) => console.log('⚡', ...args)
};

// Parse command line arguments
const args = process.argv.slice(2);
const isQuick = args.includes('--quick');
const isFull = args.includes('--full');
const shouldCompare = args.includes('--compare');

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4003';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

// Test cases
const TEST_CASES = [
  {
    name: 'Simple Status Filter',
    query: {
      filters: JSON.stringify([['status', '=', 'sent']]),
      page: 1,
      limit: 50
    },
    expectedFastPath: true
  },
  {
    name: 'Multiple Filters (Status + Volume)',
    query: {
      filters: JSON.stringify([
        ['status', '=', 'sent'],
        ['investment_volume', '>', 10000]
      ]),
      page: 1,
      limit: 50
    },
    expectedFastPath: true
  },
  {
    name: 'Date Range Filter',
    query: {
      filters: JSON.stringify([
        ['createdAt', '>=', '2024-01-01'],
        ['createdAt', '<=', '2024-12-31']
      ]),
      page: 1,
      limit: 50
    },
    expectedFastPath: true
  },
  {
    name: 'Text Search (ilike)',
    query: {
      filters: JSON.stringify([['title', 'ilike', 'festgeld']]),
      page: 1,
      limit: 50
    },
    expectedFastPath: true
  },
  {
    name: 'Complex Filter Combination',
    query: {
      filters: JSON.stringify([
        ['status', '=', 'sent'],
        ['investment_volume', 'between', [10000, 100000]],
        ['createdAt', '>=', '2024-01-01']
      ]),
      sort: '-createdAt',
      page: 1,
      limit: 50
    },
    expectedFastPath: true
  },
  {
    name: 'Group by Status (Aggregation Path)',
    query: {
      groupBy: 'status',
      aggregations: JSON.stringify({
        investment_volume: ['sum', 'avg', 'count']
      }),
      page: 1,
      limit: 10
    },
    expectedFastPath: false
  },
  {
    name: 'Group by Month (Aggregation Path)',
    query: {
      groupBy: 'createdAt',
      groupInterval: 'month',
      aggregations: JSON.stringify({
        investment_volume: ['sum', 'count']
      }),
      page: 1,
      limit: 12
    },
    expectedFastPath: false
  },
  {
    name: 'Group by Agent with Filters',
    query: {
      filters: JSON.stringify([['status', '=', 'sent']]),
      groupBy: 'agent_id',
      aggregations: JSON.stringify({
        investment_volume: ['sum', 'avg']
      }),
      page: 1,
      limit: 20
    },
    expectedFastPath: false
  }
];

/**
 * Connect to MongoDB
 */
async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
    
    if (!uri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    await mongoose.connect(uri);
    logger.success('Connected to MongoDB');
    
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error.message);
    throw error;
  }
}

/**
 * Get database statistics
 */
async function getDatabaseStats() {
  try {
    const collection = mongoose.connection.collection('offers');
    
    const [totalCount, activeCount, statusBreakdown, indexInfo] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ active: true }),
      collection.aggregate([
        { $match: { active: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray(),
      collection.indexes()
    ]);

    return {
      totalOffers: totalCount,
      activeOffers: activeCount,
      statusBreakdown,
      indexCount: indexInfo.length,
      indexes: indexInfo.map(idx => ({
        name: idx.name,
        keys: Object.keys(idx.key)
      }))
    };
  } catch (error) {
    logger.error('Failed to get database stats:', error.message);
    throw error;
  }
}

/**
 * Test API endpoint
 */
async function testEndpoint(testCase) {
  try {
    const url = `${API_BASE_URL}/offers/dynamic/query`;
    const headers = AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {};
    
    const startTime = Date.now();
    const response = await axios.get(url, {
      params: testCase.query,
      headers
    });
    const duration = Date.now() - startTime;

    const result = {
      name: testCase.name,
      success: true,
      duration,
      statusCode: response.status,
      totalResults: response.data.meta?.total || 0,
      returnedResults: response.data.data?.length || 0,
      queryTime: response.data.meta?.query_time_ms || duration,
      usedFastPath: response.data.meta?.query_info?.usesFastPath,
      expectedFastPath: testCase.expectedFastPath,
      pathCorrect: response.data.meta?.query_info?.usesFastPath === testCase.expectedFastPath
    };

    return result;
  } catch (error) {
    return {
      name: testCase.name,
      success: false,
      error: error.message,
      statusCode: error.response?.status || 0
    };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  logger.info('\\n🧪 Running Performance Tests');
  logger.info('='.repeat(80));

  const testsToRun = isQuick ? TEST_CASES.slice(0, 5) : TEST_CASES;
  const results = [];

  for (let i = 0; i < testsToRun.length; i++) {
    const testCase = testsToRun[i];
    const progress = `[${i + 1}/${testsToRun.length}]`;
    
    logger.test(`${progress} Testing: ${testCase.name}`);
    
    const result = await testEndpoint(testCase);
    results.push(result);

    if (result.success) {
      const pathIndicator = result.pathCorrect ? '✅' : '⚠️';
      const speedIndicator = result.duration < 500 ? '⚡' : result.duration < 2000 ? '🚀' : '🐌';
      
      logger.success(
        `${speedIndicator} ${result.duration}ms | ` +
        `${result.totalResults} total | ` +
        `${result.returnedResults} returned | ` +
        `${pathIndicator} ${result.usedFastPath ? 'FAST' : 'AGG'}`
      );
    } else {
      logger.error(`Failed: ${result.error}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Compare with old system (if available)
 */
async function compareWithOldSystem() {
  logger.info('\\n📊 Comparing with Old System');
  logger.info('='.repeat(80));

  try {
    // Test old endpoint
    const oldUrl = `${API_BASE_URL}/offers`;
    const headers = AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {};
    
    const startTime = Date.now();
    const response = await axios.get(oldUrl, {
      params: { page: 1, limit: 50, status: 'sent' },
      headers
    });
    const oldDuration = Date.now() - startTime;

    // Test new endpoint with same query
    const newUrl = `${API_BASE_URL}/offers/dynamic/query`;
    const newStartTime = Date.now();
    const newResponse = await axios.get(newUrl, {
      params: {
        filters: JSON.stringify([['status', '=', 'sent']]),
        page: 1,
        limit: 50
      },
      headers
    });
    const newDuration = Date.now() - newStartTime;

    const improvement = ((oldDuration - newDuration) / oldDuration * 100).toFixed(1);
    const speedup = (oldDuration / newDuration).toFixed(2);

    logger.info(`Old System: ${oldDuration}ms`);
    logger.info(`New System: ${newDuration}ms`);
    logger.perf(`Improvement: ${improvement}% faster (${speedup}x speedup)`);

    return {
      oldDuration,
      newDuration,
      improvement: parseFloat(improvement),
      speedup: parseFloat(speedup)
    };
  } catch (error) {
    logger.warn('Could not compare with old system:', error.message);
    return null;
  }
}

/**
 * Print test summary
 */
function printSummary(results, dbStats, comparison) {
  logger.info('\\n' + '='.repeat(80));
  logger.info('📊 TEST SUMMARY');
  logger.info('='.repeat(80));

  // Database stats
  logger.info('\\n📦 Database Statistics:');
  logger.info(`  Total Offers: ${dbStats.totalOffers.toLocaleString()}`);
  logger.info(`  Active Offers: ${dbStats.activeOffers.toLocaleString()}`);
  logger.info(`  Indexes: ${dbStats.indexCount}`);
  logger.info('\\n  Status Breakdown:');
  dbStats.statusBreakdown.forEach(stat => {
    logger.info(`    ${stat._id}: ${stat.count.toLocaleString()}`);
  });

  // Test results
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.duration, 0) / successful;

  const fastPathTests = results.filter(r => r.usedFastPath);
  const aggPathTests = results.filter(r => r.success && !r.usedFastPath);

  logger.info('\\n📋 Test Results:');
  logger.info(`  Total Tests: ${results.length}`);
  logger.success(`  Passed: ${successful}`);
  if (failed > 0) {
    logger.error(`  Failed: ${failed}`);
  }
  logger.info(`  Average Duration: ${avgDuration.toFixed(0)}ms`);

  logger.info('\\n⚡ Performance:');
  logger.info(`  Fast Path Tests: ${fastPathTests.length}`);
  if (fastPathTests.length > 0) {
    const avgFast = fastPathTests.reduce((sum, r) => sum + r.duration, 0) / fastPathTests.length;
    logger.success(`  Avg Fast Path: ${avgFast.toFixed(0)}ms`);
  }
  
  logger.info(`  Aggregation Path Tests: ${aggPathTests.length}`);
  if (aggPathTests.length > 0) {
    const avgAgg = aggPathTests.reduce((sum, r) => sum + r.duration, 0) / aggPathTests.length;
    logger.info(`  Avg Aggregation: ${avgAgg.toFixed(0)}ms`);
  }

  // Path verification
  const pathCorrect = results.filter(r => r.pathCorrect).length;
  const pathIncorrect = results.filter(r => r.success && !r.pathCorrect).length;
  
  if (pathIncorrect > 0) {
    logger.warn(`\\n⚠️  ${pathIncorrect} test(s) used unexpected query path`);
  } else {
    logger.success('\\n✅ All tests used correct query path!');
  }

  // Comparison
  if (comparison) {
    logger.info('\\n📊 Old vs New System:');
    logger.info(`  Old System: ${comparison.oldDuration}ms`);
    logger.info(`  New System: ${comparison.newDuration}ms`);
    logger.perf(`  Speedup: ${comparison.speedup}x (${comparison.improvement}% faster)`);
  }

  // Performance recommendations
  logger.info('\\n💡 Recommendations:');
  const slowTests = results.filter(r => r.success && r.duration > 2000);
  if (slowTests.length > 0) {
    logger.warn(`  ${slowTests.length} test(s) took > 2s:`);
    slowTests.forEach(t => {
      logger.warn(`    - ${t.name}: ${t.duration}ms`);
    });
    logger.info('  Consider adding more specific indexes for these queries');
  } else {
    logger.success('  All tests performed well! (< 2s)');
  }

  const veryFast = results.filter(r => r.success && r.duration < 200).length;
  if (veryFast > 0) {
    logger.success(`  ${veryFast} test(s) were very fast (< 200ms)!`);
  }

  logger.info('\\n' + '='.repeat(80));
}

/**
 * Test field metadata endpoint
 */
async function testFieldMetadata() {
  logger.info('\\n🔍 Testing Field Metadata Endpoint');
  logger.info('='.repeat(80));

  try {
    const url = `${API_BASE_URL}/offers/dynamic/fields`;
    const headers = AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {};
    
    const response = await axios.get(url, { headers });
    const data = response.data.data;

    logger.success(`Retrieved field metadata successfully`);
    logger.info(`  Filterable fields: ${Object.keys(data.filterable).length}`);
    logger.info(`  Sortable fields: ${Object.keys(data.sortable).length}`);
    logger.info(`  Groupable fields: ${Object.keys(data.groupable).length}`);
    logger.info(`  Aggregatable fields: ${Object.keys(data.aggregatable).length}`);

    return true;
  } catch (error) {
    logger.error('Failed to retrieve field metadata:', error.message);
    return false;
  }
}

/**
 * Test examples endpoint
 */
async function testExamples() {
  logger.info('\\n📚 Testing Examples Endpoint');
  logger.info('='.repeat(80));

  try {
    const url = `${API_BASE_URL}/offers/dynamic/examples`;
    const headers = AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {};
    
    const response = await axios.get(url, { headers });
    const examples = response.data.data;

    logger.success(`Retrieved examples successfully`);
    logger.info(`  Available examples: ${Object.keys(examples).length}`);
    
    Object.keys(examples).slice(0, 3).forEach(key => {
      logger.info(`    - ${examples[key].description}`);
    });

    return true;
  } catch (error) {
    logger.error('Failed to retrieve examples:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    logger.info('🚀 Dynamic Filtering Performance Test Tool');
    logger.info('==========================================');

    if (isQuick) {
      logger.info('Running in QUICK mode (limited tests)');
    } else if (isFull) {
      logger.info('Running in FULL mode (comprehensive tests)');
    }

    if (!AUTH_TOKEN) {
      logger.warn('\\n⚠️  No AUTH_TOKEN provided');
      logger.warn('Set TEST_AUTH_TOKEN environment variable for authenticated tests');
    }

    // Connect to database
    await connectDatabase();

    // Get database stats
    logger.info('\\nFetching database statistics...');
    const dbStats = await getDatabaseStats();

    // Test field metadata
    await testFieldMetadata();

    // Test examples
    await testExamples();

    // Run performance tests
    const results = await runTests();

    // Compare with old system if requested
    let comparison = null;
    if (shouldCompare) {
      comparison = await compareWithOldSystem();
    }

    // Print summary
    printSummary(results, dbStats, comparison);

    // Exit
    logger.success('\\n✅ All tests completed!');
    process.exit(0);
  } catch (error) {
    logger.error('\\n❌ Test suite failed:', error.message);
    logger.error(error.stack);
    process.exit(1);
  } finally {
    if (mongoose.connection) {
      await mongoose.connection.close();
    }
  }
}

// Run tests
main();

