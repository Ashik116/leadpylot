# Metadata API - Field Discovery & Filter Options

## 📋 Overview

The **Metadata API** provides dynamic field discovery, allowing frontend applications to:
- ✅ Discover all available models
- ✅ Get all fields for any model with types and operators
- ✅ Build dynamic filter UIs without hardcoding field names
- ✅ Get grouping options for any model
- ✅ Future-proof: automatically includes new fields when models change

---

## 🚀 Quick Start

### Get All Available Models

```bash
GET http://localhost:3010/api/metadata/models
```

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "name": "Lead",
      "endpoint": "/api/search/fields/Lead",
      "optionsEndpoint": "/api/search/options/Lead"
    },
    {
      "name": "Offer",
      "endpoint": "/api/search/fields/Offer",
      "optionsEndpoint": "/api/search/options/Offer"
    },
    {
      "name": "User",
      "endpoint": "/api/search/fields/User",
      "optionsEndpoint": "/api/search/options/User"
    }
  ],
  "total": 5
}
```

---

## 📊 Get Filter & Group Options (Simplified)

**Best for building UIs** - Returns only filterable and groupable fields with their operators.

```bash
GET http://localhost:3010/api/metadata/options/:model
```

### Example: Lead Options

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3010/api/metadata/options/Lead"
```

**Response:**
```json
{
  "success": true,
  "model": "Lead",
  "filterOptions": [
    {
      "field": "contact_name",
      "label": "Contact Name",
      "type": "string",
      "operators": ["=", "!=", "ilike", "like", "in", "not in"],
      "ref": null,
      "example": "example"
    },
    {
      "field": "expected_revenue",
      "label": "Expected Revenue",
      "type": "number",
      "operators": ["=", "!=", ">", ">=", "<", "<=", "in", "not in"],
      "ref": null,
      "example": 1000
    },
    {
      "field": "lead_date",
      "label": "Lead Date",
      "type": "date",
      "operators": ["=", "!=", ">", ">=", "<", "<=", "between"],
      "ref": null,
      "example": "2024-01-01"
    },
    {
      "field": "status_id",
      "label": "Status",
      "type": "reference",
      "operators": ["=", "!=", "in", "not in"],
      "ref": "Status",
      "example": "objectid_here",
      "values": [
        { "_id": "68xxx", "value": "New" },
        { "_id": "69xxx", "value": "Qualified" }
      ]
    },
    {
      "field": "stage_id",
      "label": "Stage",
      "type": "reference",
      "operators": ["=", "!=", "in", "not in"],
      "ref": "Settings",
      "values": [
        { "_id": "66xxx", "value": "Lead Stage" },
        { "_id": "67xxx", "value": "Offer Stage" }
      ]
    },
    {
      "field": "team_id",
      "label": "Project",
      "type": "reference",
      "operators": ["=", "!=", "in", "not in"],
      "ref": "Team",
      "values": [
        { "_id": "70xxx", "value": "Project Alpha" }
      ]
    },
    {
      "field": "user_id",
      "label": "Agent",
      "type": "reference",
      "operators": ["=", "!=", "in", "not in"],
      "ref": "User",
      "values": [
        { "_id": "71xxx", "value": "john.doe" }
      ]
    },
    {
      "field": "active",
      "label": "Active",
      "type": "boolean",
      "operators": ["=", "!="],
      "ref": null,
      "values": [
        { "_id": true, "value": "Yes" },
        { "_id": false, "value": "No" }
      ]
    }
  ],
  "groupOptions": [
    {
      "field": "stage_id",
      "label": "Stage",
      "type": "reference",
      "ref": "Settings",
      "values": [...]
    },
    {
      "field": "status_id",
      "label": "Status",
      "type": "reference",
      "ref": "Status",
      "values": [...]
    },
    {
      "field": "team_id",
      "label": "Project",
      "type": "reference",
      "ref": "Team",
      "values": [...]
    },
    {
      "field": "user_id",
      "label": "Agent",
      "type": "reference",
      "ref": "User",
      "values": [...]
    },
    {
      "field": "lead_date",
      "label": "Lead Date",
      "type": "date"
    },
    {
      "field": "source_id",
      "label": "Source",
      "type": "reference",
      "ref": "Source",
      "values": [...]
    }
  ],
  "availableOperators": [
    {
      "operator": "=",
      "label": "Equals",
      "types": ["string", "number", "boolean", "reference", "date"]
    },
    {
      "operator": "!=",
      "label": "Not Equals",
      "types": ["string", "number", "boolean", "reference", "date"]
    },
    {
      "operator": ">",
      "label": "Greater Than",
      "types": ["number", "date"]
    },
    {
      "operator": "ilike",
      "label": "Contains (case-insensitive)",
      "types": ["string"]
    },
    {
      "operator": "in",
      "label": "In List",
      "types": ["string", "number", "reference", "array"]
    }
  ]
}
```

---

## 🔍 Get All Fields (Detailed)

**For advanced use cases** - Returns complete field metadata including sortable, required, etc.

```bash
GET http://localhost:3010/api/metadata/fields/:model
```

### Example: Lead Fields

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3010/api/metadata/fields/Lead"
```

**Response:**
```json
{
  "success": true,
  "model": "Lead",
  "fields": {
    "contact_name": {
      "name": "contact_name",
      "label": "Contact Name",
      "type": "string",
      "required": true,
      "ref": null,
      "filterable": true,
      "groupable": true,
      "sortable": true,
      "operators": ["=", "!=", "ilike", "like", "in", "not in"],
      "example": "example"
    },
    "email_from": {
      "name": "email_from",
      "label": "Email",
      "type": "string",
      "required": false,
      "ref": null,
      "filterable": true,
      "groupable": true,
      "sortable": true,
      "operators": ["=", "!=", "ilike", "like", "in", "not in"],
      "example": "john@example.com"
    },
    "team_id": {
      "name": "team_id",
      "label": "Project",
      "type": "reference",
      "required": false,
      "ref": "Team",
      "filterable": true,
      "groupable": true,
      "sortable": false,
      "operators": ["=", "!=", "in", "not in", "is_empty", "is_not_empty"],
      "example": "objectid_here"
    },
    "user_id": {
      "name": "user_id",
      "label": "Agent",
      "type": "reference",
      "required": false,
      "ref": "User",
      "filterable": true,
      "groupable": true,
      "sortable": false,
      "operators": ["=", "!=", "in", "not in", "is_empty", "is_not_empty"],
      "example": "objectid_here"
    },
    "stage_id": {
      "name": "stage_id",
      "label": "Stage",
      "type": "reference",
      "required": false,
      "ref": "Settings",
      "filterable": true,
      "groupable": true,
      "sortable": false,
      "operators": ["=", "!=", "in", "not in", "is_empty", "is_not_empty"],
      "example": "objectid_here"
    },
    "expected_revenue": {
      "name": "expected_revenue",
      "label": "Expected Revenue",
      "type": "number",
      "required": false,
      "ref": null,
      "filterable": true,
      "groupable": true,
      "sortable": true,
      "operators": ["=", "!=", ">", ">=", "<", "<=", "in", "not in"],
      "example": 1000
    }
  },
  "meta": {
    "totalFields": 51,
    "filterableFields": 51,
    "groupableFields": 37,
    "relationFields": 8
  }
}
```

---

## 💡 Frontend Integration Examples

### React - Dynamic Filter Builder

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface FilterOption {
  field: string;
  label: string;
  type: string;
  operators: string[];
  ref: string | null;
}

export const DynamicFilterBuilder = ({ model }: { model: string }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [selectedField, setSelectedField] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [value, setValue] = useState('');
  
  useEffect(() => {
    // Fetch available filters for the model
    axios.get(`http://localhost:3010/api/metadata/options/${model}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setFilterOptions(res.data.filterOptions);
    });
  }, [model]);
  
  const selectedFieldMeta = filterOptions.find(f => f.field === selectedField);
  
  return (
    <div className="filter-builder">
      <select onChange={(e) => setSelectedField(e.target.value)}>
        <option value="">Select Field</option>
        {filterOptions.map(opt => (
          <option key={opt.field} value={opt.field}>
            {opt.label}
          </option>
        ))}
      </select>
      
      {selectedFieldMeta && (
        <select onChange={(e) => setSelectedOperator(e.target.value)}>
          <option value="">Select Operator</option>
          {selectedFieldMeta.operators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      )}
      
      <input 
        type={selectedFieldMeta?.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
      />
    </div>
  );
};
```

### React - Dynamic Group Selector

```typescript
export const DynamicGroupSelector = ({ model }: { model: string }) => {
  const [groupOptions, setGroupOptions] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  useEffect(() => {
    axios.get(`http://localhost:3010/api/metadata/options/${model}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setGroupOptions(res.data.groupOptions);
    });
  }, [model]);
  
  return (
    <div className="group-selector">
      <label>Group By:</label>
      <select 
        multiple 
        value={selectedGroups}
        onChange={(e) => {
          const values = Array.from(e.target.selectedOptions, opt => opt.value);
          setSelectedGroups(values);
        }}
      >
        {groupOptions.map(opt => (
          <option key={opt.field} value={opt.field}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
```

### Full Example: Odoo-Style Search

```typescript
const OdooStyleSearch = ({ model }: { model: string }) => {
  const [options, setOptions] = useState<any>(null);
  const [domain, setDomain] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  
  // Load metadata
  useEffect(() => {
    fetch(`http://localhost:3010/api/metadata/options/${model}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setOptions(data));
  }, [model]);
  
  // Execute search
  const executeSearch = async () => {
    const params = new URLSearchParams();
    params.append('domain', JSON.stringify(domain));
    params.append('groupBy', JSON.stringify(groupBy));
    
    const res = await fetch(`http://localhost:4003/leads?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await res.json();
    setResults(data.data);
  };
  
  // Add filter
  const addFilter = (field: string, operator: string, value: any) => {
    setDomain([...domain, [field, operator, value]]);
  };
  
  return (
    <div>
      <h2>Search {model}</h2>
      
      {/* Filter Builder */}
      {options && (
        <FilterBuilder 
          options={options.filterOptions}
          onAddFilter={addFilter}
        />
      )}
      
      {/* Group Selector */}
      {options && (
        <GroupSelector
          options={options.groupOptions}
          selectedGroups={groupBy}
          onChange={setGroupBy}
        />
      )}
      
      {/* Execute */}
      <button onClick={executeSearch}>Search</button>
      
      {/* Results */}
      <ResultsTable data={results} />
    </div>
  );
};
```

---

## 🎯 Use Cases

### 1. Build Dynamic Filter UI
No need to hardcode field names! Fetch metadata and build the UI dynamically.

```bash
# Step 1: Get available filters
GET /api/metadata/options/Lead

# Step 2: User selects: contact_name, ilike, "john"
# Build domain: [["contact_name", "ilike", "john"]]

# Step 3: Execute search
GET /leads?domain=[["contact_name","ilike","john"]]
```

### 2. Multi-Model Search
Allow users to select which model to search.

```bash
# Step 1: Get all models
GET /api/metadata/models

# Step 2: User selects "Offer"
GET /api/metadata/options/Offer

# Step 3: Build filters and search
GET /offers?domain=[["amount",">",5000]]
```

### 3. Advanced Query Builder
Build Odoo-style query interfaces.

```bash
# Complex domain
GET /leads?domain=[
  ["status","=","New"],
  ["expected_revenue",">",1000],
  ["lead_date",">=","2024-01-01"],
  ["contact_name","ilike","john"]
]
```

---

## 📝 Field Types & Operators

| Type | Operators | Example |
|------|-----------|---------|
| `string` | `=`, `!=`, `ilike`, `like`, `in`, `not in` | `"John Doe"` |
| `number` | `=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not in` | `1000` |
| `date` | `=`, `!=`, `>`, `>=`, `<`, `<=`, `between` | `"2024-01-01"` |
| `boolean` | `=`, `!=` | `true` / `false` |
| `reference` | `=`, `!=`, `in`, `not in` | `"686e6df2781309ae8c3b30f9"` |
| `array` | `in`, `not in` | `["value1", "value2"]` |

---

## 🔐 Authentication

All metadata endpoints require JWT authentication:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3010/api/metadata/options/Lead"
```

---

## ✅ Testing

```bash
# Set your token
TOKEN="your_jwt_token_here"

# 1. Get all models
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3010/api/metadata/models"

# 2. Get Lead filter options
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3010/api/metadata/options/Lead"

# 3. Get all Lead fields (detailed)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3010/api/metadata/fields/Lead"

# 4. Get Offer options
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3010/api/metadata/options/Offer"
```

---

## 🎉 Benefits

- ✅ **No Hardcoding**: Frontend doesn't need to know field names
- ✅ **Future-Proof**: New fields automatically available
- ✅ **Type-Safe**: Get correct operators for each field type
- ✅ **Multi-Model**: Works with any model in the system
- ✅ **Odoo-Style**: Familiar domain syntax for developers
- ✅ **Universal**: Same metadata API for all endpoints

---

## 🚀 Next Steps

1. **Frontend Integration**: Build dynamic filter components using these endpoints
2. **Caching**: Cache metadata responses for performance
3. **Extended Operators**: Add more operators (Polish notation, custom operators)
4. **Field Relationships**: Add support for nested field filtering (e.g., `user_id.name`)
5. **Validation**: Add value validation based on field types

---

**Your universal filtering system is now complete with dynamic field discovery!** 🎊

