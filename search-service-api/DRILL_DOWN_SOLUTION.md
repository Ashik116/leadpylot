# Drill-Down Pattern: Group + Filter Solution

## 🎯 Your Exact Requirement

```
Step 1: Group by status
→ New: 70 leads
→ Qualified: 60 leads  
→ Proposal: 30 leads
→ Closed: 10 leads

Step 2: Click "New" (70 leads)
→ Get those 70 leads with full nested data (offers, openings, etc.)

Step 3: Filter within that group
→ Show only leads with offers: 45 leads
→ Show only high-value: 20 leads
```

**All responses should include full nested data structure!**

---

## ✅ Solution: Enhanced Middleware with Dual Mode

### Architecture

```javascript
GET /leads?groupBy=["status"]
// Returns: Grouped counts
{
  "grouped": true,
  "data": [
    { "status": "New", "count": 70, "ids": [...] },
    { "status": "Qualified", "count": 60, "ids": [...] }
  ]
}

GET /leads?groupBy=["status"]&expand=true
// Returns: Grouped counts WITH full lead data
{
  "grouped": true,
  "data": [
    { 
      "status": "New", 
      "count": 70,
      "leads": [
        { _id, contact_name, offers: [...], appointments: [...] }
      ]
    },
    { 
      "status": "Qualified",
      "count": 60,
      "leads": [...]
    }
  ]
}

GET /leads?domain=[["status","=","New"]]
// Returns: Those 70 leads with full data
{
  "data": [
    { _id, contact_name, offers: [...], appointments: [...] }
  ],
  "meta": { "total": 70, "page": 1 }
}
```

---

## 💻 Complete Implementation

### Enhanced Universal Middleware

```javascript
// middleware/universalQuery.js

const universalQueryMiddleware = async (req, res, next) => {
  const { domain, groupBy, expand } = req.query;
  
  // Pass through if no universal params
  if (!domain && !groupBy) {
    return next();
  }
  
  try {
    const parsedDomain = domain ? JSON.parse(domain) : [];
    const parsedGroupBy = groupBy ? JSON.parse(groupBy) : [];
    const shouldExpand = expand === 'true';
    
    const modelName = detectModelFromRoute(req.path);
    
    // CASE 1: Grouping with expansion (group + full records)
    if (parsedGroupBy.length > 0 && shouldExpand) {
      return await handleGroupingWithExpansion(req, res, {
        modelName,
        groupBy: parsedGroupBy,
        domain: parsedDomain,
        originalQuery: req.query
      });
    }
    
    // CASE 2: Grouping only (counts + IDs)
    if (parsedGroupBy.length > 0) {
      return await handleGroupingOnly(req, res, {
        modelName,
        groupBy: parsedGroupBy,
        domain: parsedDomain,
        originalQuery: req.query
      });
    }
    
    // CASE 3: Filtering only (get records)
    if (parsedDomain.length > 0) {
      return await handleFilteringOnly(req, res, {
        modelName,
        domain: parsedDomain,
        originalQuery: req.query
      });
    }
    
  } catch (error) {
    console.error('Universal query error:', error);
    return next();
  }
};

/**
 * CASE 1: Grouping with full record expansion
 * Returns: Groups with counts AND full lead data
 */
async function handleGroupingWithExpansion(req, res, { modelName, groupBy, domain, originalQuery }) {
  const { page = 1, limit = 50 } = originalQuery;
  
  // Step 1: Get grouped data with IDs
  const groupResult = await queryEngine.search({
    modelName,
    domain,
    groupBy,
    includeIds: true  // Return lead IDs in each group
  });
  
  // Step 2: For each group, fetch full records
  const expandedGroups = await Promise.all(
    groupResult.data.map(async (group) => {
      const groupLeadIds = group._recordIds || [];
      
      if (groupLeadIds.length === 0) {
        return { ...group, leads: [], count: 0 };
      }
      
      // Fetch full leads with nested data
      const leads = await fetchFullLeadsWithNesting(
        groupLeadIds.slice(0, parseInt(limit)), // Limit per group
        req.user
      );
      
      return {
        ...group._id,  // Group keys (e.g., { status: 'New' })
        count: group.count,
        leads: leads,
        totalInGroup: groupLeadIds.length
      };
    })
  );
  
  return res.json({
    success: true,
    grouped: true,
    expanded: true,
    data: expandedGroups,
    meta: {
      totalGroups: expandedGroups.length,
      page: parseInt(page),
      limit: parseInt(limit)
    }
  });
}

/**
 * CASE 2: Grouping only (counts + IDs, no full records)
 * Returns: Fast aggregation with just counts
 */
async function handleGroupingOnly(req, res, { modelName, groupBy, domain }) {
  // Fast aggregation - just counts and IDs
  const result = await queryEngine.search({
    modelName,
    domain,
    groupBy,
    includeIds: true,
    countsOnly: true
  });
  
  return res.json({
    success: true,
    grouped: true,
    data: result.data.map(group => ({
      ...group._id,
      count: group.count,
      ids: group._recordIds  // Array of lead IDs for drill-down
    })),
    meta: result.meta
  });
}

/**
 * CASE 3: Filtering only (get full records)
 * Returns: Full leads with nested data
 */
async function handleFilteringOnly(req, res, { modelName, domain, originalQuery }) {
  const { page = 1, limit = 50 } = originalQuery;
  
  // Query with search service
  const result = await queryEngine.search({
    modelName,
    domain,
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });
  
  // For Leads, enrich with nested data
  if (modelName === 'Lead' && result.data.length > 0) {
    const enrichedLeads = await fetchFullLeadsWithNesting(
      result.data.map(l => l._id),
      req.user
    );
    result.data = enrichedLeads;
  }
  
  return res.json({
    success: true,
    data: result.data,
    meta: result.meta
  });
}

/**
 * Fetch leads with full nested structure
 * (Reuses your existing fetchLeadRelatedData logic)
 */
async function fetchFullLeadsWithNesting(leadIds, user) {
  // Get base leads
  const leads = await Lead.find({ _id: { $in: leadIds } })
    .select('_id contact_name email_from phone status ...')
    .lean();
  
  // Fetch all related data (your existing logic)
  const {
    assignments,
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments,
    stageMap,
    statusMap
  } = await fetchLeadRelatedData(leadIds);
  
  // Create lookup maps
  const lookupMaps = createLookupMaps(
    assignments,
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments
  );
  
  // Process leads with nested data
  const processedLeads = processLeadsWithRelatedData(
    leads,
    lookupMaps,
    stageMap,
    statusMap,
    true, // includeOffers
    user,
    null, // projectFilter
    new Set() // favouriteLeadIds
  );
  
  // Add todo counts
  const todoCountResults = await Todo.aggregate([
    { $match: { lead_id: { $in: leadIds }, active: true, isDone: false } },
    { $group: { _id: '$lead_id', todoCount: { $sum: 1 } } }
  ]);
  
  const todoCountMap = new Map(
    todoCountResults.map(r => [r._id.toString(), r.todoCount])
  );
  
  return processedLeads.map(lead => ({
    ...lead,
    todoCount: todoCountMap.get(lead._id.toString()) || 0
  }));
}

module.exports = universalQueryMiddleware;
```

---

## 📊 Enhanced Query Engine (Add to search-service)

```javascript
// services/queryEngine.js

async search({ 
  modelName, 
  domain = [], 
  groupBy = [], 
  includeIds = false,
  countsOnly = false,
  limit = 80, 
  offset = 0 
}) {
  const Model = this.getModel(modelName);
  const pipeline = [];
  const lookups = new Map();

  // Parse domain and add match stage
  const matchStage = this._parseDomain(domain, Model.schema, lookups);
  
  // Add lookups
  for (const [key, lookupStages] of lookups) {
    pipeline.push(...lookupStages);
  }
  
  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Handle grouping
  if (groupBy.length > 0) {
    const groupStage = this._buildGroupStage(groupBy, Model.schema, lookups);
    
    // Re-add lookups for groupBy fields
    pipeline.length = 0;
    for (const [key, lookupStages] of lookups) {
      pipeline.push(...lookupStages);
    }
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }
    
    // ADD: Collect record IDs if requested
    if (includeIds) {
      groupStage.$group._recordIds = { $push: '$_id' };
    }
    
    pipeline.push({ $group: groupStage.$group });
    
    // Sort by count descending
    pipeline.push({ $sort: { count: -1 } });
    
  } else {
    // Regular query (non-grouped)
    const [sortField, sortDir] = (orderBy || 'createdAt desc').split(' ');
    pipeline.push({ $sort: { [sortField]: sortDir === 'desc' ? -1 : 1 } });
    pipeline.push({ $skip: parseInt(offset) });
    pipeline.push({ $limit: parseInt(limit) });
  }

  const results = await Model.aggregate(pipeline);

  return {
    data: results,
    meta: {
      total: results.length,
      limit,
      offset
    }
  };
}
```

---

## 🎨 Frontend Usage Examples

### Example 1: Dashboard with Drill-Down

```typescript
// LeadsDashboard.tsx

export default function LeadsDashboard() {
  const [view, setView] = useState<'grouped' | 'detailed'>('grouped');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groups, setGroups] = useState([]);
  const [leads, setLeads] = useState([]);
  
  // Step 1: Load grouped data
  useEffect(() => {
    async function loadGroups() {
      const response = await axios.get('/api/lead-offers/leads', {
        params: {
          groupBy: JSON.stringify(['status']),
          domain: JSON.stringify([['active', '=', true]])
        }
      });
      
      setGroups(response.data.data);
    }
    
    loadGroups();
  }, []);
  
  // Step 2: Drill down into a group
  const drillDown = async (status) => {
    const response = await axios.get('/api/lead-offers/leads', {
      params: {
        domain: JSON.stringify([['status', '=', status]]),
        page: 1,
        limit: 50
      }
    });
    
    setLeads(response.data.data);
    setSelectedGroup(status);
    setView('detailed');
  };
  
  return (
    <div>
      <h1>Leads Dashboard</h1>
      
      {view === 'grouped' && (
        <div className="grid grid-cols-4 gap-4">
          {groups.map(group => (
            <Card 
              key={group.status}
              onClick={() => drillDown(group.status)}
              className="cursor-pointer hover:shadow-lg"
            >
              <h3>{group.status}</h3>
              <p className="text-4xl font-bold">{group.count}</p>
              <p className="text-sm text-gray-500">leads</p>
            </Card>
          ))}
        </div>
      )}
      
      {view === 'detailed' && (
        <div>
          <Button onClick={() => setView('grouped')}>← Back to Groups</Button>
          <h2>Leads: {selectedGroup} ({leads.length})</h2>
          
          {/* Full lead table with nested data */}
          <LeadsTable data={leads} />
        </div>
      )}
    </div>
  );
}
```

### Example 2: Group with Inline Expansion

```typescript
// LeadsPageWithExpansion.tsx

export default function LeadsPageWithExpansion() {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [groupedData, setGroupedData] = useState([]);
  
  // Load groups with counts
  useEffect(() => {
    loadGroups();
  }, []);
  
  const loadGroups = async () => {
    const response = await axios.get('/api/lead-offers/leads', {
      params: {
        groupBy: JSON.stringify(['status'])
      }
    });
    
    setGroupedData(response.data.data);
  };
  
  // Expand a group to show leads
  const toggleGroup = async (status) => {
    if (expandedGroups.includes(status)) {
      // Collapse
      setExpandedGroups(expandedGroups.filter(s => s !== status));
    } else {
      // Expand - fetch leads for this group
      const response = await axios.get('/api/lead-offers/leads', {
        params: {
          domain: JSON.stringify([['status', '=', status]]),
          limit: 20
        }
      });
      
      // Update group data
      setGroupedData(prev => prev.map(group => 
        group.status === status 
          ? { ...group, leads: response.data.data }
          : group
      ));
      
      setExpandedGroups([...expandedGroups, status]);
    }
  };
  
  return (
    <div>
      {groupedData.map(group => (
        <div key={group.status} className="mb-4">
          <div 
            className="flex justify-between p-4 bg-gray-100 cursor-pointer"
            onClick={() => toggleGroup(group.status)}
          >
            <h3>{group.status}</h3>
            <span className="font-bold">{group.count} leads</span>
            <ChevronIcon expanded={expandedGroups.includes(group.status)} />
          </div>
          
          {expandedGroups.includes(group.status) && group.leads && (
            <div className="p-4">
              <LeadsTable data={group.leads} compact />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Example 3: All-in-One with Expand Parameter

```typescript
// SuperFastDashboard.tsx

export default function SuperFastDashboard() {
  const [data, setData] = useState([]);
  
  // Load groups WITH full lead data in one call
  useEffect(() => {
    async function loadAll() {
      const response = await axios.get('/api/lead-offers/leads', {
        params: {
          groupBy: JSON.stringify(['status']),
          expand: 'true',  // Get full leads in each group
          limit: 10  // Limit leads per group
        }
      });
      
      setData(response.data.data);
    }
    
    loadAll();
  }, []);
  
  return (
    <div>
      {data.map(group => (
        <div key={group.status}>
          <h2>{group.status} - {group.totalInGroup} leads</h2>
          
          {/* Leads are already loaded! */}
          <LeadsTable data={group.leads} />
          
          {group.totalInGroup > 10 && (
            <Button>View all {group.totalInGroup} leads</Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🚀 API Examples

### Example 1: Simple Grouping (Fast)
```bash
GET /leads?groupBy=["status"]

Response:
{
  "grouped": true,
  "data": [
    { "status": "New", "count": 70, "ids": ["id1", "id2", ...] },
    { "status": "Qualified", "count": 60, "ids": [...] },
    { "status": "Proposal", "count": 30, "ids": [...] },
    { "status": "Closed", "count": 10, "ids": [...] }
  ]
}
```

### Example 2: Drill-Down (Get Those 70 Leads)
```bash
GET /leads?domain=[["status","=","New"]]&limit=70

Response:
{
  "data": [
    {
      "_id": "...",
      "contact_name": "John Doe",
      "status": "New",
      "offers": [
        {
          "_id": "...",
          "openings": [...]
        }
      ],
      "appointments": [...],
      "todoCount": 3
    },
    // ... 69 more leads with full nested data
  ],
  "meta": { "total": 70, "page": 1, "limit": 70 }
}
```

### Example 3: Group with Expansion (One Call)
```bash
GET /leads?groupBy=["status"]&expand=true&limit=10

Response:
{
  "grouped": true,
  "expanded": true,
  "data": [
    {
      "status": "New",
      "count": 70,
      "totalInGroup": 70,
      "leads": [
        { /* full lead with nested data */ },
        // ... 9 more (limited to 10)
      ]
    },
    {
      "status": "Qualified",
      "count": 60,
      "leads": [...]
    }
  ]
}
```

### Example 4: Multi-Level Grouping
```bash
GET /leads?groupBy=["status","user_id"]

Response:
{
  "data": [
    { "status": "New", "user_id": "user1", "count": 25 },
    { "status": "New", "user_id": "user2", "count": 45 },
    { "status": "Qualified", "user_id": "user1", "count": 30 },
    { "status": "Qualified", "user_id": "user2", "count": 30 }
  ]
}
```

### Example 5: Filter Within Group
```bash
# Step 1: Group
GET /leads?groupBy=["status"]
# Result: New has 70 leads

# Step 2: Get those 70 leads
GET /leads?domain=[["status","=","New"]]

# Step 3: Further filter those 70
GET /leads?domain=[["status","=","New"],["offers.investment_volume",">",25000]]
# Result: 45 leads (high-value ones from the "New" group)
```

---

## 📊 Performance Optimization

### Strategy 1: Cache Group Counts
```javascript
// Cache the expensive aggregation
const groupKey = `groups:leads:${JSON.stringify(groupBy)}:${JSON.stringify(domain)}`;
let groups = await redis.get(groupKey);

if (!groups) {
  groups = await queryEngine.search({ modelName: 'Lead', groupBy, domain });
  await redis.set(groupKey, JSON.stringify(groups), 'EX', 300); // 5min cache
}
```

### Strategy 2: Lazy Loading
```javascript
// Don't expand all groups by default
// Only fetch leads when user clicks
<GroupCard onClick={() => loadLeadsForGroup(groupId)} />
```

### Strategy 3: Virtual Scrolling
```javascript
// For large groups (1000+ leads)
// Load in batches as user scrolls
<VirtualList
  items={leads}
  onLoadMore={() => loadMoreLeads(offset + 50)}
/>
```

---

## ✅ This Solution Gives You

✅ **Group by anything**: status, user, date, custom fields
✅ **Get counts**: See how many in each group
✅ **Drill down**: Click to see those leads
✅ **Full nested data**: Offers, openings, appointments included
✅ **Filter within groups**: Further narrow down results
✅ **Multi-level grouping**: Group by status AND user
✅ **Fast**: Aggregation for counts, detailed query only when needed
✅ **Flexible**: Works on ALL endpoints automatically

---

## 🎯 Answer to Your Question

**"I should be able to get those 70 leads response also including count"**

**YES! You get BOTH:**

```javascript
// Step 1: Group (get counts)
GET /leads?groupBy=["status"]
→ Returns: { status: "New", count: 70, ids: [...] }

// Step 2: Get those 70 leads (with full data)
GET /leads?domain=[["status","=","New"]]
→ Returns: 70 full leads with offers, openings, appointments, todoCount

// OR: Get both in one call
GET /leads?groupBy=["status"]&expand=true
→ Returns: Groups with counts AND full leads in each group
```

**Want me to implement this? It's the perfect drill-down solution.** 🚀

