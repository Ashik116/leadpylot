# Odoo Compatibility Roadmap
## Making Search Service a Complete Odoo Clone

---

## 🎯 Current Status vs Odoo

| Feature | Odoo | Our Service | Status |
|---------|------|-------------|--------|
| Basic Operators | ✅ 20+ | ✅ 10+ | 🟡 50% |
| Polish Notation (OR/AND/NOT) | ✅ | ❌ | 🔴 0% |
| Nested Domains | ✅ Unlimited | ❌ | 🔴 0% |
| Auto-Join Relations | ✅ | ✅ | 🟢 100% |
| Date/Time Operators | ✅ Advanced | 🟡 Basic | 🟡 40% |
| Search Methods | ✅ 5 methods | 🟡 1 method | 🟡 20% |
| Domain Normalization | ✅ | ❌ | 🔴 0% |
| Expression Evaluation | ✅ | ❌ | 🔴 0% |
| Context-Aware Search | ✅ | ❌ | 🔴 0% |
| Computed Fields | ✅ | ❌ | 🔴 0% |
| Many2many Relations | ✅ | 🟡 Partial | 🟡 50% |
| Field Metadata API | ✅ | ❌ | 🔴 0% |

**Overall Compatibility: 30%**

---

## 📚 Odoo Domain System - Deep Dive

### 1. **Polish Notation (Prefix Notation)**

In Odoo, complex logic uses **prefix operators**:

```python
# AND (implicit - default behavior)
[('name', '=', 'John'), ('age', '>', 30)]
# Both conditions must be true

# OR - explicit operator
['|', ('name', '=', 'John'), ('age', '>', 30)]
# Either condition can be true

# NOT - negation operator
['!', ('active', '=', True)]
# Inverts the condition

# Complex nesting
[
  '|',                           # OR
    '&',                         # AND
      ('name', '=', 'John'),
      ('age', '>', 30),
  ('status', '=', 'vip')
]
# (name='John' AND age>30) OR status='vip'
```

**How it works**:
- `|` (OR) - Next 2 conditions are OR'd
- `&` (AND) - Next 2 conditions are AND'd (implicit by default)
- `!` (NOT) - Negates the next condition
- Operators consume the next N operands based on arity

**Current State**: ❌ We only support implicit AND

**Implementation Needed**:
```javascript
// src/services/domainParser.js
class DomainParser {
  parse(domain) {
    const stack = [];
    let i = 0;
    
    while (i < domain.length) {
      const token = domain[i];
      
      if (token === '|') {
        // OR - pop 2, combine with $or
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ $or: [left, right] });
      } 
      else if (token === '&') {
        // AND - pop 2, combine with $and
        const right = stack.pop();
        const left = stack.pop();
        stack.push({ $and: [left, right] });
      }
      else if (token === '!') {
        // NOT - pop 1, negate
        const condition = stack.pop();
        stack.push({ $nor: [condition] });
      }
      else if (Array.isArray(token)) {
        // Regular condition [field, op, value]
        stack.push(this._buildCondition(token));
      }
      i++;
    }
    
    return stack.length === 1 ? stack[0] : { $and: stack };
  }
}
```

---

### 2. **Complete Operator Set**

Odoo supports **20+ operators**. We need to add:

| Operator | Odoo | Our Service | MongoDB Equivalent |
|----------|------|-------------|-------------------|
| `=` | ✅ | ✅ | `{ field: value }` |
| `!=` | ✅ | ✅ | `{ field: { $ne: value } }` |
| `>`, `<`, `>=`, `<=` | ✅ | ✅ | `{ field: { $gt/$lt: value } }` |
| `in`, `not in` | ✅ | ✅ | `{ field: { $in/$nin: [] } }` |
| `ilike`, `like` | ✅ | ✅ | `{ field: { $regex: ... } }` |
| `=like` | ✅ | ❌ | Pattern match with % |
| `=ilike` | ✅ | ❌ | Case-insensitive pattern |
| `not like` | ✅ | ❌ | `{ field: { $not: { $regex } } }` |
| `not ilike` | ✅ | ❌ | Case-insensitive NOT LIKE |
| `child_of` | ✅ | ❌ | Hierarchical search |
| `parent_of` | ✅ | ❌ | Reverse hierarchy |
| `any` | ✅ | ❌ | Many2many ANY |
| `not any` | ✅ | ❌ | Many2many exclusion |

**Implementation**:
```javascript
_buildCondition(field, operator, value) {
  switch (operator) {
    // Existing operators...
    
    case '=like':
      // SQL LIKE: 'abc%' -> starts with 'abc'
      const likePattern = value.replace(/%/g, '.*').replace(/_/g, '.');
      return { [field]: { $regex: `^${this._escapeRegex(likePattern)}$` } };
    
    case '=ilike':
      const ilikePattern = value.replace(/%/g, '.*').replace(/_/g, '.');
      return { [field]: { $regex: `^${this._escapeRegex(ilikePattern)}$`, $options: 'i' } };
    
    case 'not like':
      return { [field]: { $not: { $regex: this._escapeRegex(value) } } };
    
    case 'not ilike':
      return { [field]: { $not: { $regex: this._escapeRegex(value), $options: 'i' } } };
    
    case 'child_of':
      // For hierarchical models (e.g., categories, teams)
      return this._buildHierarchyQuery(field, value, 'descendants');
    
    case 'parent_of':
      return this._buildHierarchyQuery(field, value, 'ancestors');
    
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
```

---

### 3. **Search Methods (Like Odoo ORM)**

Odoo has multiple search methods:

```python
# Method 1: search() - Returns IDs
lead_ids = Lead.search([('status', '=', 'new')], limit=10)

# Method 2: search_read() - Returns records with fields
leads = Lead.search_read([('status', '=', 'new')], fields=['name', 'email'], limit=10)

# Method 3: search_count() - Returns count only
count = Lead.search_count([('status', '=', 'new')])

# Method 4: read() - Read specific IDs
leads = Lead.read([id1, id2], fields=['name', 'email'])

# Method 5: read_group() - Grouped aggregation
groups = Lead.read_group(
    [('status', '=', 'new')],
    fields=['user_id', 'revenue:sum'],
    groupby=['user_id']
)
```

**Our Implementation Needed**:

```javascript
// routes/searchRoutes.js
router.post('/', authenticate, searchController.search);           // ✅ Exists
router.post('/read', authenticate, searchController.searchRead);   // ❌ Add
router.post('/count', authenticate, searchController.searchCount); // ❌ Add
router.post('/ids', authenticate, searchController.searchIds);     // ❌ Add
router.post('/group', authenticate, searchController.readGroup);   // ❌ Add
```

**Example API**:
```javascript
// POST /api/search (existing)
{
  "model": "Lead",
  "domain": [['status', '=', 'new']],
  "limit": 10
}
// Returns: Full documents

// POST /api/search/ids (new)
{
  "model": "Lead",
  "domain": [['status', '=', 'new']],
  "limit": 10
}
// Returns: { ids: ['...', '...'] }

// POST /api/search/read (new)
{
  "model": "Lead",
  "domain": [['status', '=', 'new']],
  "fields": ["contact_name", "email_from", "status"],
  "limit": 10
}
// Returns: Only specified fields (projection)

// POST /api/search/count (new)
{
  "model": "Lead",
  "domain": [['status', '=', 'new']]
}
// Returns: { count: 345 }

// POST /api/search/group (new)
{
  "model": "Lead",
  "domain": [['status', '=', 'new']],
  "fields": ["user_id", "revenue:sum", "count"],
  "groupby": ["user_id", "stage_id"]
}
// Returns: Aggregated data with SUM, AVG, MIN, MAX
```

---

### 4. **Aggregation Functions (read_group)**

Odoo supports aggregations in `read_group`:

```python
Lead.read_group(
    domain=[('status', '=', 'new')],
    fields=['user_id', 'revenue:sum', 'revenue:avg', 'count'],
    groupby=['user_id']
)
```

**Supported Aggregations**:
- `field:sum` - Total sum
- `field:avg` - Average
- `field:min` - Minimum
- `field:max` - Maximum
- `field:count` - Count (implicit)

**Implementation**:
```javascript
// src/services/queryEngine.js
_buildGroupStage(groupBy, fields, schema, lookups) {
  const groupStage = {
    _id: {},
    count: { $sum: 1 }
  };
  
  // Group by fields
  groupBy.forEach(field => {
    groupStage._id[field] = `$${field}`;
  });
  
  // Parse aggregation fields
  fields.forEach(fieldSpec => {
    if (fieldSpec.includes(':')) {
      const [field, func] = fieldSpec.split(':');
      
      switch (func) {
        case 'sum':
          groupStage[`${field}_sum`] = { $sum: `$${field}` };
          break;
        case 'avg':
          groupStage[`${field}_avg`] = { $avg: `$${field}` };
          break;
        case 'min':
          groupStage[`${field}_min`] = { $min: `$${field}` };
          break;
        case 'max':
          groupStage[`${field}_max`] = { $max: `$${field}` };
          break;
      }
    }
  });
  
  return { $group: groupStage };
}
```

---

### 5. **Context-Aware Searches**

Odoo supports **context** for dynamic behavior:

```python
# Active test - filter by active field
Lead.with_context(active_test=False).search([])  # Include inactive

# Language-specific searches
Lead.with_context(lang='de_DE').search([('name', 'ilike', 'test')])

# Company-specific
Lead.with_context(company_id=2).search([])
```

**Implementation**:
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [['status', '=', 'new']],
  "context": {
    "active_test": false,          // Include inactive records
    "lang": "de_DE",               // Language for translations
    "tz": "Europe/Berlin",         // Timezone for dates
    "company_id": 2                // Multi-company filtering
  }
}
```

**Handler**:
```javascript
async search({ modelName, domain, context = {} }) {
  const Model = this.getModel(modelName);
  const pipeline = [];
  
  // Apply context filters
  const matchStage = this._parseDomain(domain, Model.schema, lookups);
  
  // Active test (default: only active records)
  if (context.active_test !== false && Model.schema.path('active')) {
    matchStage.active = true;
  }
  
  // Multi-company support
  if (context.company_id && Model.schema.path('company_id')) {
    matchStage.company_id = context.company_id;
  }
  
  // ... rest of pipeline
}
```

---

### 6. **Field Metadata API**

Odoo provides `fields_get()` to discover model structure:

```python
# Get all fields for a model
fields_meta = Lead.fields_get()

# Returns:
{
  'name': {
    'type': 'char',
    'string': 'Name',
    'required': True,
    'searchable': True
  },
  'user_id': {
    'type': 'many2one',
    'relation': 'res.users',
    'string': 'Salesperson'
  }
}
```

**Implementation**:
```javascript
// GET /api/search/fields/:model
router.get('/fields/:model', authenticate, searchController.getFields);

// Controller
async getFields(req, res) {
  const { model } = req.params;
  const Model = queryEngine.getModel(model);
  
  const fields = {};
  Model.schema.eachPath((path, schemaType) => {
    fields[path] = {
      type: this._getFieldType(schemaType),
      label: schemaType.options.label || path,
      required: schemaType.options.required || false,
      ref: schemaType.options.ref || null,
      searchable: true,
      sortable: !['Object', 'Array'].includes(schemaType.instance)
    };
  });
  
  res.json({ success: true, model, fields });
}
```

**Response**:
```json
{
  "success": true,
  "model": "Lead",
  "fields": {
    "contact_name": {
      "type": "string",
      "label": "Contact Name",
      "required": true,
      "searchable": true,
      "sortable": true
    },
    "user_id": {
      "type": "many2one",
      "ref": "User",
      "label": "Assigned User",
      "searchable": true,
      "sortable": true
    },
    "status": {
      "type": "string",
      "label": "Status",
      "searchable": true,
      "sortable": true
    }
  }
}
```

---

### 7. **Domain Normalization**

Odoo normalizes domains to canonical form:

```python
# Input variations (all equivalent):
[('name', '=', 'John')]
['&', ('name', '=', 'John'), ('age', '>', 30)]
[('name', '=', 'John'), ('age', '>', 30)]  # Implicit AND

# Normalized to:
['&', ('name', '=', 'John'), ('age', '>', 30)]
```

**Implementation**:
```javascript
class DomainNormalizer {
  normalize(domain) {
    if (!Array.isArray(domain) || domain.length === 0) {
      return [];
    }
    
    // Separate operators from conditions
    const conditions = domain.filter(item => Array.isArray(item));
    const operators = domain.filter(item => typeof item === 'string');
    
    // If no operators, add implicit ANDs
    if (operators.length === 0 && conditions.length > 1) {
      const normalized = [];
      for (let i = 0; i < conditions.length - 1; i++) {
        normalized.push('&');
      }
      normalized.push(...conditions);
      return normalized;
    }
    
    return domain;
  }
  
  validate(domain) {
    // Check if domain is syntactically correct
    // Count operators vs conditions
    let operatorCount = 0;
    let conditionCount = 0;
    
    domain.forEach(item => {
      if (typeof item === 'string' && ['|', '&', '!'].includes(item)) {
        operatorCount++;
      } else if (Array.isArray(item)) {
        conditionCount++;
      }
    });
    
    // Validation logic...
    return true;
  }
}
```

---

### 8. **Computed Fields Support**

Odoo can search on computed/stored fields:

```python
class Lead(models.Model):
    name = fields.Char()
    full_name = fields.Char(compute='_compute_full_name', store=True)
    
    def _compute_full_name(self):
        for lead in self:
            lead.full_name = f"{lead.name} ({lead.email})"

# Search on computed field
Lead.search([('full_name', 'ilike', 'john')])
```

**Implementation**:
```javascript
// In Mongoose schema, use virtuals with storage
const leadSchema = new Schema({
  contact_name: String,
  email_from: String,
  computed_full_name: String  // Stored computed field
});

// Middleware to compute before save
leadSchema.pre('save', function(next) {
  this.computed_full_name = `${this.contact_name} (${this.email_from})`;
  next();
});

// Search service works transparently
domain: [['computed_full_name', 'ilike', 'john']]
```

---

### 9. **Hierarchical Queries (child_of, parent_of)**

Odoo supports tree structures:

```python
# Find all subcategories under "Electronics"
Category.search([('id', 'child_of', electronics_id)])

# Find all parent categories of "Laptops"
Category.search([('id', 'parent_of', laptops_id)])
```

**Implementation**:
```javascript
// For models with parent_id field
async _buildHierarchyQuery(field, value, direction) {
  const Model = this.getModel(modelName);
  
  if (direction === 'descendants') {
    // Find all children recursively
    const descendants = await this._getDescendants(Model, value);
    return { _id: { $in: descendants } };
  } else {
    // Find all parents recursively
    const ancestors = await this._getAncestors(Model, value);
    return { _id: { $in: ancestors } };
  }
}

async _getDescendants(Model, parentId, collected = []) {
  const children = await Model.find({ parent_id: parentId }).select('_id').lean();
  const childIds = children.map(c => c._id);
  
  collected.push(...childIds);
  
  for (const childId of childIds) {
    await this._getDescendants(Model, childId, collected);
  }
  
  return collected;
}
```

---

### 10. **Many2many Special Operators**

Odoo has special handling for many2many fields:

```python
# Any tag matches
Lead.search([('tag_ids', 'in', [tag1, tag2])])  # Has ANY of these tags

# All tags must match
Lead.search([('tag_ids', '=', tag1), ('tag_ids', '=', tag2)])  # Has ALL

# No tags from list
Lead.search([('tag_ids', 'not in', [tag1, tag2])])  # Has NONE
```

**Implementation**:
```javascript
_buildCondition(field, operator, value) {
  const schemaPath = schema.path(field);
  
  // Check if field is array (many2many equivalent)
  if (schemaPath && schemaPath.instance === 'Array') {
    switch (operator) {
      case 'in':
        // ANY match
        return { [field]: { $in: Array.isArray(value) ? value : [value] } };
      
      case '=':
        // ALL match
        return { [field]: { $all: Array.isArray(value) ? value : [value] } };
      
      case 'not in':
        // NONE match
        return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    }
  }
  
  // Regular field logic...
}
```

---

## 🛠️ Implementation Roadmap

### **Phase 1: Core Logic (4-6 weeks)**

#### Week 1-2: Polish Notation Parser
```javascript
// Priority: CRITICAL
// Complexity: HIGH
// Impact: HIGH

Tasks:
1. Create DomainParser class
2. Implement stack-based parser for |, &, !
3. Add tests for complex nested domains
4. Update QueryEngine to use parser
```

**Deliverable**:
```javascript
// Should support:
domain: [
  '|',
    '&',
      ['name', '=', 'John'],
      ['age', '>', 30],
    ['status', '=', 'vip']
]
// (name='John' AND age>30) OR status='vip'
```

#### Week 3: Extended Operators
```javascript
// Priority: HIGH
// Complexity: MEDIUM
// Impact: MEDIUM

Tasks:
1. Add =like, =ilike, not like, not ilike
2. Implement pattern matching with % and _
3. Add tests for all new operators
```

#### Week 4: Domain Normalization
```javascript
// Priority: MEDIUM
// Complexity: LOW
// Impact: LOW

Tasks:
1. Create DomainNormalizer class
2. Implement validation logic
3. Add auto-normalization middleware
```

#### Week 5-6: Search Methods
```javascript
// Priority: HIGH
// Complexity: MEDIUM
// Impact: HIGH

Tasks:
1. Implement searchIds (IDs only)
2. Implement searchRead (with field projection)
3. Implement searchCount (count only)
4. Implement readGroup (with aggregations)
```

---

### **Phase 2: Advanced Features (3-4 weeks)**

#### Week 7: Field Metadata API
```javascript
// Priority: HIGH (for frontend)
// Complexity: LOW
// Impact: HIGH

Tasks:
1. Create GET /api/search/fields/:model endpoint
2. Extract schema metadata
3. Return Odoo-compatible field definitions
```

#### Week 8-9: Hierarchical Queries
```javascript
// Priority: MEDIUM
// Complexity: HIGH
// Impact: MEDIUM

Tasks:
1. Implement child_of operator
2. Implement parent_of operator
3. Add recursive tree traversal
4. Optimize with caching
```

#### Week 10: Context Support
```javascript
// Priority: MEDIUM
// Complexity: MEDIUM
// Impact: MEDIUM

Tasks:
1. Add context parameter to all methods
2. Implement active_test
3. Implement company_id filtering
4. Add timezone/language support
```

---

### **Phase 3: Optimization & Polish (2-3 weeks)**

#### Week 11: Performance
```javascript
Tasks:
1. Add query result caching (Redis)
2. Optimize aggregation pipelines
3. Add database indexes recommendations
4. Load testing with 1M+ records
```

#### Week 12: Frontend Integration
```javascript
Tasks:
1. Create Odoo-style FilterBuilder component
2. Add GroupBy UI component
3. Create SearchView component (like Odoo)
4. Build documentation site
```

#### Week 13: Production Readiness
```javascript
Tasks:
1. Add comprehensive error messages
2. Implement rate limiting
3. Add audit logging
4. Write migration scripts
```

---

## 📖 Usage Examples (After Full Implementation)

### Example 1: Complex OR/AND Logic
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    '|',
      '&',
        ['status', '=', 'new'],
        ['revenue', '>', 10000],
      '&',
        ['status', '=', 'qualified'],
        ['user_id.team_id.name', '=', 'Sales']
  ]
}
// (status='new' AND revenue>10000) OR (status='qualified' AND user.team='Sales')
```

### Example 2: Hierarchical Categories
```javascript
POST /api/search
{
  "model": "Category",
  "domain": [
    ['id', 'child_of', electronicsId]  // All subcategories
  ]
}
```

### Example 3: Advanced Grouping with Aggregations
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
    "count"
  ],
  "groupby": ["user_id", "stage_id"]
}
// Response:
{
  "data": [
    {
      "_id": { "user_id": "...", "stage_id": "..." },
      "count": 45,
      "investment_volume_sum": 1250000,
      "investment_volume_avg": 27777.78
    }
  ]
}
```

### Example 4: Field Projection (Optimize Bandwidth)
```javascript
POST /api/search/read
{
  "model": "Lead",
  "domain": [['status', '=', 'new']],
  "fields": ["contact_name", "email_from", "phone", "status"],
  "limit": 100
}
// Returns ONLY specified fields (not full documents)
```

### Example 5: Pattern Matching
```javascript
POST /api/search
{
  "model": "Lead",
  "domain": [
    ['email_from', '=ilike', '%@gmail.com'],    // Ends with @gmail.com
    ['phone', '=like', '+49%']                  // Starts with +49
  ]
}
```

---

## 🎯 Success Metrics

After full implementation, we should achieve:

| Metric | Target |
|--------|--------|
| **Odoo Compatibility** | 95%+ |
| **Query Performance** | <100ms for 90% of queries |
| **Code Reduction** | 80% less filtering code |
| **API Consistency** | 100% (one API for everything) |
| **Frontend Reusability** | One FilterBuilder for all models |
| **Developer Productivity** | 5x faster to add new filters |

---

## 🚀 Quick Start Guide (Post-Implementation)

### For Developers
```javascript
// 1. Search with complex logic
const leads = await searchService.search({
  model: 'Lead',
  domain: [
    '|',
      ['status', '=', 'new'],
      ['status', '=', 'qualified'],
    ['revenue', '>', 5000]
  ]
});

// 2. Get field metadata
const fields = await searchService.getFields('Lead');
// Use this to build dynamic filter UIs

// 3. Aggregation
const stats = await searchService.readGroup({
  model: 'Offer',
  domain: [],
  fields: ['revenue:sum', 'count'],
  groupby: ['user_id']
});
```

### For Frontend
```tsx
// Universal FilterBuilder component
<FilterBuilder
  model="Lead"
  onSearch={(domain) => {
    // Automatically generates Odoo-style domains
    searchService.search({ model: 'Lead', domain });
  }}
/>

// Renders UI like:
// [Field ▼] [Operator ▼] [Value      ] [+ Add]
// [status ] [   =     ] [new        ] [x]
// [OR/AND]
// [revenue] [   >     ] [10000      ] [x]
```

---

## 🏆 Competitive Advantage

After completing this roadmap:

1. ✅ **Same Power as Odoo** - Full domain system
2. ✅ **Better Performance** - MongoDB aggregations
3. ✅ **Modern Stack** - Node.js + REST API
4. ✅ **Zero Learning Curve** - Odoo developers already know the syntax
5. ✅ **Universal** - Works on ANY model
6. ✅ **Frontend-Friendly** - One FilterBuilder component
7. ✅ **80% Less Code** - Replace thousands of lines

---

## 📋 Next Steps

### Immediate (This Week)
1. ✅ Review this roadmap
2. ⏳ Prioritize features (which ones first?)
3. ⏳ Set up task tracking (GitHub Issues/Jira)
4. ⏳ Allocate developer time

### Week 1
1. Start Phase 1: Polish Notation Parser
2. Write comprehensive tests
3. Document progress

### Month 1 Goal
- Complete Phase 1 (Core Logic)
- Have working OR/AND/NOT support
- Add extended operators

### Month 2-3 Goal
- Complete Phase 2 (Advanced Features)
- Production-ready search service
- Frontend integration complete

---

**Questions to Answer**:
1. Do you want 100% Odoo compatibility or just the most useful 80%?
2. Priority order: Polish Notation → Aggregations → Hierarchy?
3. Should we add non-Odoo features (e.g., full-text search, geospatial)?

Let me know and I'll start implementing! 🚀

