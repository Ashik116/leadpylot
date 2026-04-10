# Before & After: Real-World Query Transformations

## How Odoo-Style Search Simplifies Your Current Code

---

## Example 1: Filter Leads by Status OR Revenue

### ❌ Current Code (Lead-Offers-Service)
**File**: `src/services/leadService/filters.js` (805 lines)

```javascript
// You'd need to write custom code:
async function getLeadsForDashboard(statusFilter, revenueFilter) {
  let query = { active: true };
  
  // Option 1: Status filter
  if (statusFilter) {
    query.status = statusFilter;
  }
  
  // Option 2: Revenue filter  
  if (revenueFilter && !statusFilter) {
    query.expected_revenue = { $gte: revenueFilter };
  }
  
  // Problem: Can't do "status=new OR revenue>10000" without complex logic
  // You'd need to build a $or query manually:
  if (statusFilter && revenueFilter) {
    delete query.status;
    query.$or = [
      { status: statusFilter },
      { expected_revenue: { $gte: revenueFilter } }
    ];
  }
  
  const leads = await Lead.find(query).lean();
  return leads;
}
```

**Lines of Code**: ~30 lines for this simple case

### ✅ After (Odoo-Compatible Search Service)

```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    '|',                              // OR operator
      ['status', '=', 'new'],
      ['expected_revenue', '>', 10000]
  ]
}
```

**Lines of Code**: 0 (just API call from frontend)

---

## Example 2: Complex Lead Filtering (Agent OR Project)

### ❌ Current Code
**File**: `src/services/leadService/filters.js` (lines 432-489)

```javascript
// 58 lines of code to filter by agent name
if (agent_name) {
  additionalFilters.hasAdvancedFilters = true;

  const agentRegex = new RegExp(agent_name, 'i');
  const matchingAgents = await mongoose
    .model('User')
    .find({
      $or: [
        { login: agentRegex }, 
        { first_name: agentRegex }, 
        { last_name: agentRegex }
      ],
    })
    .select('_id')
    .lean();

  if (matchingAgents.length > 0) {
    const agentIds = matchingAgents.map((a) => a._id);

    const assignments = await AssignLeads.find({
      agent_id: { $in: agentIds },
      status: 'active',
    })
      .sort({ assigned_at: -1 })
      .select('lead_id assigned_at')
      .lean();

    if (assignments.length > 0) {
      const leadAssignmentMap = new Map();
      assignments.forEach(assignment => {
        const leadId = assignment.lead_id.toString();
        if (!leadAssignmentMap.has(leadId)) {
          leadAssignmentMap.set(leadId, assignment);
        }
      });
      
      const leadIdsFromAgents = Array.from(leadAssignmentMap.values()).map(a => a.lead_id);

      if (additionalFilters.leadIds !== null) {
        additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
          leadIdsFromAgents.some((agentLeadId) => agentLeadId.toString() === id.toString())
        );
      } else {
        additionalFilters.leadIds = leadIdsFromAgents;
      }
    } else {
      additionalFilters.leadIds = [];
      dbQuery._id = { $in: [] };
      return { dbQuery, additionalFilters };
    }
  } else {
    additionalFilters.leadIds = [];
    dbQuery._id = { $in: [] };
    return { dbQuery, additionalFilters };
  }
}

// Now add project filter (another 50+ lines)...
// Then combine them with OR logic (another 30+ lines)...
```

**Lines of Code**: ~138 lines total

### ✅ After (Odoo-Compatible)

```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    '|',                                        // OR
      ['user_id.login', 'ilike', 'John'],      // Auto-join to User
      ['project_id.name', 'ilike', 'ABN Amro'] // Auto-join to Project
  ]
}
```

**Lines of Code**: 0

**Explanation**:
- Auto-join detects `user_id.login` and automatically joins User table
- `ilike` does case-insensitive regex matching
- `|` operator combines with OR logic

---

## Example 3: Multi-Level Conditions (Realistic Dashboard Query)

### ❌ Current Code
**Would require custom endpoint**:

```javascript
// routes/leads.js
router.get('/dashboard/qualified-high-value', authenticate, async (req, res) => {
  try {
    // Step 1: Find agents in Sales team
    const salesTeam = await Team.findOne({ name: /sales/i });
    const salesAgents = await User.find({ team_id: salesTeam._id });
    const agentIds = salesAgents.map(a => a._id);
    
    // Step 2: Find their lead assignments
    const assignments = await AssignLeads.find({ 
      agent_id: { $in: agentIds },
      status: 'active' 
    });
    const leadIds = assignments.map(a => a.lead_id);
    
    // Step 3: Find leads matching criteria
    const leads = await Lead.find({
      _id: { $in: leadIds },
      $or: [
        { status: 'qualified' },
        { status: 'proposal' }
      ],
      expected_revenue: { $gte: 25000 },
      active: true
    }).lean();
    
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Lines of Code**: ~35 lines + route setup

### ✅ After (Odoo-Compatible)

```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    '&',                                          // AND (implicit, but shown for clarity)
      '|',                                        // OR for status
        ['status', '=', 'qualified'],
        ['status', '=', 'proposal'],
      '&',                                        // AND for rest
        ['user_id.team_id.name', 'ilike', 'Sales'],  // Multi-level join!
        ['expected_revenue', '>=', 25000]
  ],
  "context": {
    "active_test": true  // Only active records (default)
  }
}
```

**Lines of Code**: 0

**What's happening**:
- `user_id.team_id.name` does **2 auto-joins**: Lead → User → Team
- Polish notation handles complex `(status='qualified' OR status='proposal') AND team='Sales' AND revenue>=25000`
- No custom endpoint needed

---

## Example 4: Grouping with Aggregations

### ❌ Current Code
**File**: `src/controllers/filterController.js`

```javascript
// POST /filters/group-by
const groupByTable = asyncHandler(async (req, res) => {
  const { table, groupByFields } = req.body;
  
  // 100+ lines of validation, permission checks, etc.
  
  const pipeline = [
    { $match: baseQuery },
    {
      $group: {
        _id: { /* build group ID */ },
        count: { $sum: 1 }
        // Manual aggregation logic
      }
    },
    // Lookup stages if needed
    // Unwind stages
    // Sort, format, etc.
  ];
  
  const results = await Model.aggregate(pipeline);
  
  // Format results (another 50+ lines)
  // ...
});
```

**Lines of Code**: ~200 lines in controller + 100 in filters = 300 total

### ✅ After (Odoo-Compatible)

```javascript
POST /api/search/group
{
  "model": "Offer",
  "domain": [
    ['stage_id', '!=', null],
    ['createdAt', '>=', '2024-01-01']
  ],
  "fields": [
    "user_id",
    "investment_volume:sum",
    "investment_volume:avg",
    "investment_volume:max",
    "count"
  ],
  "groupby": ["user_id", "stage_id"]
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": { "user_id": "68a2a9ae...", "stage_id": "68ca690a..." },
      "count": 45,
      "investment_volume_sum": 1250000,
      "investment_volume_avg": 27777.78,
      "investment_volume_max": 150000
    }
  ]
}
```

**Lines of Code**: 0

**Bonus**: Works on ANY model (not just hardcoded tables)

---

## Example 5: Date Range with User Filter

### ❌ Current Code

```javascript
async function getLeadsCreatedThisWeek(userId, teamId) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const query = {
    createdAt: { $gte: startOfWeek },
    active: true
  };
  
  // If regular agent, filter by user
  if (userId) {
    query.user_id = userId;
  }
  
  // If team lead, get all team members
  if (teamId) {
    const teamMembers = await User.find({ team_id: teamId }).select('_id');
    query.user_id = { $in: teamMembers.map(u => u._id) };
  }
  
  return await Lead.find(query).lean();
}
```

**Lines of Code**: ~25 lines

### ✅ After (Odoo-Compatible)

```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    ['createdAt', '>=', 'this_week'],           // Smart date parsing
    ['user_id.team_id', '=', teamId]            // Auto-join
  ]
}
```

**Date Parsing** (to be implemented):
```javascript
// Smart date values:
'today'
'yesterday'
'this_week'
'this_month'
'last_30_days'
'2024-01-01'  // ISO dates
```

**Lines of Code**: 0

---

## Example 6: Search Across Multiple Related Models

### ❌ Current Code
**Not easily possible - would need multiple queries**:

```javascript
// "Find leads where the user's team leader is John"
async function getLeadsByTeamLeader(leaderName) {
  // Step 1: Find leader
  const leader = await User.findOne({ 
    $or: [{ login: /john/i }, { first_name: /john/i }] 
  });
  
  // Step 2: Find teams led by this user
  const teams = await Team.find({ leader_id: leader._id });
  const teamIds = teams.map(t => t._id);
  
  // Step 3: Find users in those teams
  const teamMembers = await User.find({ team_id: { $in: teamIds } });
  const memberIds = teamMembers.map(u => u._id);
  
  // Step 4: Find leads
  const leads = await Lead.find({ user_id: { $in: memberIds } });
  
  return leads;
}
```

**Lines of Code**: ~20 lines + 4 database queries

### ✅ After (Odoo-Compatible)

```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    ['user_id.team_id.leader_id.login', 'ilike', 'john']  // 3-level join!
  ]
}
```

**Lines of Code**: 0
**Database Queries**: 1 (single aggregation pipeline)

---

## Example 7: Complex Offer Filtering (Real Business Logic)

### Scenario
"Show me offers from the last quarter where:
- Investment is between €20k-€50k
- Agent is in Munich office OR Berlin office
- Status is 'in_progress' OR 'follow_up'
- Project is NOT 'Test Project'"

### ❌ Current Code
**Would require extensive custom logic**:

```javascript
async function getComplexOffers() {
  // Calculate date range
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  
  // Find Munich and Berlin users
  const offices = await Office.find({ 
    name: { $in: ['Munich', 'Berlin'] } 
  });
  const officeIds = offices.map(o => o._id);
  const users = await User.find({ office_id: { $in: officeIds } });
  const userIds = users.map(u => u._id);
  
  // Find test project IDs
  const testProjects = await Project.find({ name: /test/i });
  const testProjectIds = testProjects.map(p => p._id);
  
  // Build complex query
  const offers = await Offer.find({
    investment_volume: { $gte: 20000, $lte: 50000 },
    agent_id: { $in: userIds },
    status: { $in: ['in_progress', 'follow_up'] },
    project_id: { $nin: testProjectIds },
    createdAt: { $gte: quarterStart }
  }).lean();
  
  return offers;
}
```

**Lines of Code**: ~30 lines + multiple queries

### ✅ After (Odoo-Compatible)

```javascript
POST /api/search
{
  "model": "Offer",
  "domain": [
    '&',
      ['investment_volume', 'between', [20000, 50000]],
      '&',
        '|',
          ['agent_id.office_id.name', '=', 'Munich'],
          ['agent_id.office_id.name', '=', 'Berlin'],
        '&',
          '|',
            ['status', '=', 'in_progress'],
            ['status', '=', 'follow_up'],
          '&',
            ['!', ['project_id.name', 'ilike', 'test']],  // NOT operator
            ['createdAt', '>=', 'this_quarter']
  ]
}
```

**Lines of Code**: 0
**Explanation**:
- `between` operator for range
- Multi-level auto-joins: `agent_id.office_id.name`
- `!` for negation (NOT test project)
- Smart date: `this_quarter`

---

## Example 8: Count Queries for Dashboard Cards

### ❌ Current Code

```javascript
// Dashboard.jsx
useEffect(() => {
  async function fetchCounts() {
    // Each card needs separate query
    const newLeads = await api.get('/leads/count?status=new');
    const qualifiedLeads = await api.get('/leads/count?status=qualified');
    const highValueLeads = await api.get('/leads/count?revenue_gte=25000');
    
    setNewCount(newLeads.data.count);
    setQualifiedCount(qualifiedLeads.data.count);
    setHighValueCount(highValueLeads.data.count);
  }
  
  fetchCounts();
}, []);
```

**API Calls**: 3 separate requests

### ✅ After (Odoo-Compatible)

```javascript
// Dashboard.jsx
useEffect(() => {
  async function fetchCounts() {
    const results = await Promise.all([
      searchService.searchCount({
        model: 'Lead',
        domain: [['status', '=', 'new']]
      }),
      searchService.searchCount({
        model: 'Lead',
        domain: [['status', '=', 'qualified']]
      }),
      searchService.searchCount({
        model: 'Lead',
        domain: [['expected_revenue', '>=', 25000]]
      })
    ]);
    
    setNewCount(results[0].count);
    setQualifiedCount(results[1].count);
    setHighValueCount(results[2].count);
  }
  
  fetchCounts();
}, []);
```

**Or even better, single request**:
```javascript
POST /api/search/group
{
  "model": "Lead",
  "domain": [],
  "fields": ["count"],
  "groupby": ["status"]
}
// Returns counts for ALL statuses at once
```

---

## Example 9: Export with Custom Filters

### ❌ Current Code
**File**: `src/services/leadService/export.js`

```javascript
async function exportLeadsWithFilters(filters) {
  // Rebuild the same complex filter logic as in filters.js
  const { dbQuery, additionalFilters } = await buildLeadQuery(filters);
  
  let leads;
  if (additionalFilters.leadIds) {
    leads = await Lead.find({
      ...dbQuery,
      _id: { $in: additionalFilters.leadIds }
    }).lean();
  } else {
    leads = await Lead.find(dbQuery).lean();
  }
  
  // Format for export
  const csv = convertToCSV(leads);
  return csv;
}
```

**Problem**: Duplicated filter logic

### ✅ After (Odoo-Compatible)

```javascript
async function exportLeadsWithFilters(domain) {
  // Use SAME search service as everywhere else
  const leads = await searchService.searchRead({
    model: 'Lead',
    domain: domain,
    fields: ['contact_name', 'email_from', 'phone', 'status', 'revenue']
    // No limit - get all matching
  });
  
  const csv = convertToCSV(leads);
  return csv;
}
```

**Benefit**: No duplicated logic, same API everywhere

---

## Summary: Code Reduction Metrics

| Use Case | Current (Lines) | After (Lines) | Reduction |
|----------|----------------|---------------|-----------|
| Simple OR filter | 30 | 0 | **100%** |
| Agent + Project filter | 138 | 0 | **100%** |
| Multi-level joins | 35 | 0 | **100%** |
| Group by with aggregation | 300 | 0 | **100%** |
| Date range + user filter | 25 | 0 | **100%** |
| Complex offer filtering | 30 | 0 | **100%** |
| Export with filters | 50 (duplicated) | 10 | **80%** |

**Total Lines Removed**: **~608 lines** for just these 7 examples

**Extrapolated**:
- Lead filtering: 805 lines
- Offer filtering: ~600 lines
- Opening filtering: ~400 lines
- Other models: ~500 lines

**Total Potential Reduction**: **~2,300 lines** replaced with **universal API**

---

## 🎯 Key Takeaways

### What Makes Odoo-Style Better?

1. ✅ **Zero Backend Code** - Everything from frontend
2. ✅ **Universal API** - One endpoint for all models
3. ✅ **No Duplication** - Same logic for list/export/dashboard
4. ✅ **Auto-Joins** - No manual relationship handling
5. ✅ **Expressive** - Complex logic in simple syntax
6. ✅ **Type-Safe** - Domain validation ensures correctness
7. ✅ **Performance** - Single aggregation pipeline
8. ✅ **Maintainable** - No spaghetti filter code

### What It Enables

```javascript
// ONE universal FilterBuilder component
<FilterBuilder 
  model="Lead"  // or "Offer", "Opening", "User", etc.
  onChange={(domain) => {
    // Works for ANY model
    searchService.search({ model, domain });
  }}
/>

// Same component for:
// - Leads list
// - Offers list
// - Openings list
// - Users list
// - Dashboard cards
// - Export dialogs
// - Reports
```

**Result**: Build filtering UI **once**, use **everywhere**.

---

*Ready to implement? Start with Phase 1 (Polish Notation Parser) from the roadmap!* 🚀

