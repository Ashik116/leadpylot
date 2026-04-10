/**
 * Integration test for saved-filter CRUD (uses MONGODB_URI from .env).
 * Run from configuration-service-api: npm run test:saved-filters
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDatabase = require('../src/config/database');
const savedFilterService = require('../src/services/savedFilterService');
const { validateDomain } = require('../src/utils/domainValidation');

const SAMPLE_DOMAIN = [
  ['team_id', 'in', ['686e76249084eed90292b0e8']],
  ['status_id', 'in', ['699d1f30c9f42bed49935bd8']],
];

const ALT_DOMAIN = [
  ['amount_expected', 'between', [10000, 50000]],
  ['name', 'ilike', 'john'],
];

function testDomainValidation() {
  const assertThrows = (domain, label) => {
    try {
      validateDomain(domain, { allowEmpty: false });
      throw new Error(`expected ValidationError for: ${label}`);
    } catch (e) {
      if (e.statusCode !== 400) throw e;
    }
  };

  assertThrows([], 'empty domain');
  assertThrows('x', 'non-array');
  assertThrows([['1bad', 'in', []]], 'invalid field name');
  assertThrows([['team_id', 'not_a_real_op', [1]]], 'invalid operator');
  assertThrows([['team_id', 'in']], 'tuple not length 3');
  assertThrows([['createdAt', 'between', ['2026-01-01']]], 'between requires 2 items');
  assertThrows([['createdAt', 'between', '2026-01-01']], 'between requires array');

  validateDomain(SAMPLE_DOMAIN, { allowEmpty: false });
  validateDomain(['|', ['a', '=', 1], ['b', '=', 2]], { allowEmpty: false });
  validateDomain([['createdAt', 'between', ['2026-01-01', '2026-02-01']]], { allowEmpty: false });
  validateDomain([['phone', 'is_empty', null]], { allowEmpty: false });
  validateDomain([['phone', 'is_not_empty', null]], { allowEmpty: false });
  validateDomain([['deletedAt', 'is_null', null]], { allowEmpty: false });
}

async function assertRejectsValidation(label, fn) {
  try {
    await fn();
    throw new Error(`expected ValidationError for: ${label}`);
  } catch (e) {
    if (e.statusCode !== 400) {
      throw e;
    }
    console.log(`   OK rejected (${label}):`, e.message);
  }
}

async function run() {
  const createdIds = [];

  async function createAndTrack(payload) {
    const doc = await savedFilterService.createSavedFilter(userId, payload);
    createdIds.push(doc._id.toString());
    return doc;
  }

  console.log('0. domain validation rules');
  testDomainValidation();
  console.log('   OK');

  console.log('\nConnecting to MongoDB...');
  await connectDatabase();

  const userId = new mongoose.Types.ObjectId();
  console.log('Test user_id:', userId.toString());

  console.log('\n1. create baseline filter');
  const created = await createAndTrack({
    title: 'Script test filter',
    page: 'lead',
    type: 'filter',
    description: 'temp test row',
    domain: SAMPLE_DOMAIN,
  });
  console.log('   OK filter _id:', created._id);

  console.log('\n2. create baseline grouping');
  const createdGrouping = await createAndTrack({
    title: 'Script test grouping',
    page: 'lead',
    type: 'grouping',
    groupBy: ['team_id', 'user_id', 'status_id'],
  });
  console.log('   OK grouping _id:', createdGrouping._id);

  console.log('\n3. create extra rows for list/sort/pagination coverage');
  await createAndTrack({
    title: 'A - alpha filter',
    page: 'lead',
    type: 'filter',
    domain: ALT_DOMAIN,
  });
  await createAndTrack({
    title: 'B - beta grouping',
    page: 'lead',
    type: 'grouping',
    groupBy: ['stage_id', 'status_id'],
  });
  await createAndTrack({
    title: 'Offer only filter',
    page: 'offer',
    type: 'filter',
    domain: [['active', '=', true]],
  });
  console.log('   OK extra rows created');

  console.log('\n4. validate create edge-case rejections');
  await assertRejectsValidation('missing type payload (no domain and no groupBy)', async () =>
    savedFilterService.createSavedFilter(userId, {
      title: 'Invalid missing payload',
      page: 'lead',
      type: 'filter',
    })
  );
  await assertRejectsValidation('type=grouping with domain', async () =>
    savedFilterService.createSavedFilter(userId, {
      title: 'Invalid grouping with domain',
      page: 'lead',
      type: 'grouping',
      domain: SAMPLE_DOMAIN,
      groupBy: ['team_id'],
    })
  );
  await assertRejectsValidation('type=filter with groupBy', async () =>
    savedFilterService.createSavedFilter(userId, {
      title: 'Invalid filter with groupBy',
      page: 'lead',
      type: 'filter',
      groupBy: ['team_id'],
      domain: SAMPLE_DOMAIN,
    })
  );
  await assertRejectsValidation('type=grouping missing groupBy', async () =>
    savedFilterService.createSavedFilter(userId, {
      title: 'Invalid grouping missing groupBy',
      page: 'lead',
      type: 'grouping',
    })
  );
  await assertRejectsValidation('invalid type value', async () =>
    savedFilterService.createSavedFilter(userId, {
      title: 'Invalid type',
      page: 'lead',
      type: 'something',
      domain: SAMPLE_DOMAIN,
    })
  );
  await assertRejectsValidation('invalid groupBy field name', async () =>
    savedFilterService.createSavedFilter(userId, {
      title: 'Invalid groupBy field',
      page: 'lead',
      type: 'grouping',
      groupBy: ['1bad'],
    })
  );

  console.log('\n5. listSavedFilters(type=filter)');
  const filtersOnly = await savedFilterService.listSavedFilters(userId, {
    type: 'filter',
    page: 1,
    limit: 20,
  });
  if (!filtersOnly.data.every((d) => d.type === 'filter')) {
    throw new Error('list type=filter returned non-filter row');
  }
  console.log('   OK count:', filtersOnly.data.length);

  console.log('\n6. listSavedFilters(type=grouping)');
  const groupingsOnly = await savedFilterService.listSavedFilters(userId, {
    type: 'grouping',
    page: 1,
    limit: 20,
  });
  if (!groupingsOnly.data.every((d) => d.type === 'grouping')) {
    throw new Error('list type=grouping returned non-grouping row');
  }
  console.log('   OK count:', groupingsOnly.data.length);

  console.log('\n7. listSavedFiltersByPage(lead, type=grouping, page alias)');
  const byPageGrouping = await savedFilterService.listSavedFiltersByPage(userId, 'lead', {
    type: 'grouping',
    page: 1,
    limit: 20,
  });
  if (!byPageGrouping.data.every((d) => d.page === 'lead' && d.type === 'grouping')) {
    throw new Error('by-page grouping returned unexpected rows');
  }
  console.log('   OK count:', byPageGrouping.data.length);

  console.log('\n8. listSavedFilters(search=Script matches title)');
  const list = await savedFilterService.listSavedFilters(userId, {
    search: 'Script',
    page: 1,
    limit: 10,
  });
  console.log('   OK count:', list.data.length, 'meta:', list.meta);

  console.log('\n9. listSavedFilters(search=lead matches page field)');
  const listPageSearch = await savedFilterService.listSavedFilters(userId, {
    search: 'lead',
    page: 1,
    limit: 10,
  });
  console.log('   OK count:', listPageSearch.data.length);

  console.log('\n10. listSavedFiltersByPage(lead)');
  const byPage = await savedFilterService.listSavedFiltersByPage(userId, 'lead', {
    page: 1,
    limit: 20,
  });
  console.log('   OK count:', byPage.data.length);

  console.log('\n11. list page-specific for offer only');
  const byPageOffer = await savedFilterService.listSavedFiltersByPage(userId, 'offer', {
    page: 1,
    limit: 20,
  });
  if (!byPageOffer.data.every((d) => d.page === 'offer')) {
    throw new Error('by-page offer returned wrong page data');
  }
  console.log('   OK count:', byPageOffer.data.length);

  console.log('\n12. pagination and sorting edge checks');
  const paged = await savedFilterService.listSavedFilters(userId, {
    page: 2,
    limit: 1,
    sortBy: 'title',
    sortOrder: 'asc',
  });
  if (paged.meta.page !== 2 || paged.meta.limit !== 1) {
    throw new Error('pagination meta mismatch');
  }
  console.log('   OK meta:', paged.meta);

  console.log('\n13. getSavedFilterById');
  const one = await savedFilterService.getSavedFilterById(created._id.toString(), userId);
  console.log('   OK title:', one.title, 'page:', one.page, 'type:', one.type);

  console.log('\n14. update filter with valid payload');
  const updated = await savedFilterService.updateSavedFilter(created._id.toString(), userId, {
    title: 'Updated script title',
    page: 'lead',
    type: 'filter',
    domain: SAMPLE_DOMAIN,
  });
  console.log('   OK title:', updated.title);

  console.log('\n15. update edge-case rejections');
  await assertRejectsValidation('update filter with groupBy provided', async () =>
    savedFilterService.updateSavedFilter(created._id.toString(), userId, {
      title: 'Bad update',
      page: 'lead',
      type: 'filter',
      domain: SAMPLE_DOMAIN,
      groupBy: ['team_id'],
    })
  );
  await assertRejectsValidation('update grouping with domain provided', async () =>
    savedFilterService.updateSavedFilter(createdGrouping._id.toString(), userId, {
      title: 'Bad grouping update',
      page: 'lead',
      type: 'grouping',
      domain: SAMPLE_DOMAIN,
      groupBy: ['team_id'],
    })
  );
  await assertRejectsValidation('update grouping missing groupBy', async () =>
    savedFilterService.updateSavedFilter(createdGrouping._id.toString(), userId, {
      title: 'Bad grouping update 2',
      page: 'lead',
      type: 'grouping',
    })
  );
  await assertRejectsValidation('update non-objectId id', async () =>
    savedFilterService.updateSavedFilter('bad-id', userId, {
      title: 'Bad id',
      page: 'lead',
      type: 'filter',
      domain: SAMPLE_DOMAIN,
    })
  );

  console.log('\n16. delete all created rows');
  for (const id of createdIds) {
    try {
      await savedFilterService.deleteSavedFilter(id, userId);
    } catch (e) {
      if (e.statusCode !== 404) throw e;
    }
  }
  console.log('   OK deleted count:', createdIds.length);

  console.log('\n17. getSavedFilterById after delete (expect 404)');
  try {
    await savedFilterService.getSavedFilterById(created._id.toString(), userId);
    console.log('   FAIL expected NotFoundError');
    process.exitCode = 1;
  } catch (e) {
    if (e.statusCode === 404) {
      console.log('   OK not found');
    } else {
      throw e;
    }
  }

  console.log('\n18. listSavedFiltersByPage invalid pageContext (expect 400)');
  await assertRejectsValidation('by-page missing pageContext', async () =>
    savedFilterService.listSavedFiltersByPage(userId, '   ', { limit: 10 })
  );

  await mongoose.connection.close();
  console.log('\nAll checks passed. Connection closed.');
}

run().catch((err) => {
  console.error('\nTest failed:', err.message);
  if (err.stack) console.error(err.stack);
  mongoose.connection.close().catch(() => {});
  process.exit(1);
});
