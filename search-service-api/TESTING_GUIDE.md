# Universal Query Middleware - Testing Guide

## 🚀 Implementation Complete!

The Universal Query Middleware has been integrated into your system. Here's how to test it.

---

## ✅ What's Been Implemented

1. **Universal Query Middleware** - Intercepts requests with `domain` and `groupBy` parameters
2. **Enhanced QueryEngine** - Supports `includeIds` for drill-down functionality
3. **Integrated into lead-offers-service** - Works on `/leads`, `/offers`, `/openings`, `/appointments`, `/todos`, `/confirmations`, `/payment-vouchers`

---

## 🧪 Testing Instructions

### Prerequisites

1. Ensure both services are running:
```bash
# Terminal 1: Search Service
cd backend/microservices/search-service
npm run dev

# Terminal 2: Lead-Offers Service
cd backend/microservices/lead-offers-service
npm run dev
```

2. Get your authentication token:
```bash
# Login to get token
POST http://localhost:4000/auth/login
{
  "login": "your_username",
  "password": "your_password"
}

# Copy the token from response
```

---

## 📊 Test Scenarios

### Test 1: Simple Filtering (Basic)

**Original endpoint (still works):**
```bash
GET http://localhost:4003/leads?page=1&limit=50
Authorization: Bearer YOUR_TOKEN
```

**With filtering:**
```bash
GET http://localhost:4003/leads?page=1&limit=50&domain=[["status","=","New"]]
Authorization: Bearer YOUR_TOKEN
```

**Expected Result:**
- Returns leads with `status = "New"`
- Same response format as original
- Includes full nested data (offers, openings, appointments, todoCount)

---

### Test 2: Grouping (Get Counts)

```bash
GET http://localhost:4003/leads?groupBy=["status"]
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "grouped": true,
  "data": [
    {
      "status": "New",
      "count": 70,
      "recordIds": ["id1", "id2", "id3", ...]
    },
    {
      "status": "Qualified",
      "count": 60,
      "recordIds": [...]
    },
    {
      "status": "Proposal",
      "count": 30,
      "recordIds": [...]
    }
  ],
  "meta": {
    "totalGroups": 3
  }
}
```

---

### Test 3: Drill-Down (Group → Get Records)

**Step 1: Group to see counts**
```bash
GET http://localhost:4003/leads?groupBy=["status"]
```

**Step 2: Get those 70 "New" leads**
```bash
GET http://localhost:4003/leads?domain=[["status","=","New"]]&limit=70
```

**Expected Result:**
- Returns all 70 leads
- Full nested data included (offers, openings, etc.)
- Same format as normal endpoint

---

### Test 4: Group with Expansion (One Call)

```bash
GET http://localhost:4003/leads?groupBy=["status"]&expand=true&limit=10
Authorization: Bearer YOUR_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "grouped": true,
  "expanded": true,
  "data": [
    {
      "status": "New",
      "count": 70,
      "totalInGroup": 70,
      "hasMore": true,
      "records": [
        {
          "_id": "...",
          "contact_name": "John Doe",
          "status": "New",
          "offers": [
            {
              "_id": "...",
              "title": "Offer 1",
              "openings": [...]
            }
          ],
          "appointments": [...],
          "todoCount": 5
        }
        // ... 9 more (limited to 10)
      ]
    },
    {
      "status": "Qualified",
      "count": 60,
      "records": [...]
    }
  ]
}
```

---

### Test 5: Multi-Level Grouping

```bash
GET http://localhost:4003/leads?groupBy=["status","use_status"]
Authorization: Bearer YOUR_TOKEN
```

**Expected Result:**
- Groups by status AND use_status
- Shows count for each combination

---

### Test 6: Complex Filtering (OR Logic)

```bash
GET http://localhost:4003/leads?domain=[["|",["status","=","New"],["status","=","Qualified"]]]&limit=50
Authorization: Bearer YOUR_TOKEN
```

**Means:** `status='New' OR status='Qualified'`

---

### Test 7: Filter with Auto-Join

```bash
GET http://localhost:4003/leads?domain=[["user_id.login","ilike","admin"]]&limit=50
Authorization: Bearer YOUR_TOKEN
```

**Expected Result:**
- Automatically joins User table
- Filters by user login containing "admin"
- Returns leads with full nested data

---

### Test 8: Works on Offers Endpoint

```bash
# Group offers by status
GET http://localhost:4003/offers?groupBy=["status"]
Authorization: Bearer YOUR_TOKEN

# Filter offers
GET http://localhost:4003/offers?domain=[["investment_volume",">",25000]]
Authorization: Bearer YOUR_TOKEN
```

---

### Test 9: Works on Appointments

```bash
# Group appointments by date
GET http://localhost:4003/appointments?groupBy=["appointment_date"]
Authorization: Bearer YOUR_TOKEN

# Filter future appointments
GET http://localhost:4003/appointments?domain=[["appointment_date",">=","2024-12-01"]]
Authorization: Bearer YOUR_TOKEN
```

---

## 🐛 Troubleshooting

### Issue 1: Middleware Not Working

**Symptom:** Query params ignored, returns normal response

**Fix:**
1. Check if search-service is running on port 3010
2. Verify the middleware is loaded in app.js
3. Check console logs for errors

### Issue 2: "Model not found" Error

**Symptom:** Error: Model Lead not found

**Fix:**
1. Ensure search-service models are loaded
2. Check `src/models/loader.js` in search-service
3. Restart search-service

### Issue 3: Empty Results

**Symptom:** Returns empty array when data exists

**Fix:**
1. Check domain syntax (must be valid JSON array)
2. Try without filtering first
3. Check auth token is valid

---

## 📝 URL Encoding Tips

For complex domains, you may need to URL-encode:

```javascript
// JavaScript
const domain = [["status", "=", "New"]];
const encoded = encodeURIComponent(JSON.stringify(domain));
const url = `http://localhost:4003/leads?domain=${encoded}`;
```

**Example:**
```bash
# Not encoded (may work in Postman)
GET /leads?domain=[["status","=","New"]]

# Properly encoded (works everywhere)
GET /leads?domain=%5B%5B%22status%22%2C%22%3D%22%2C%22New%22%5D%5D
```

---

## 🎨 Frontend Usage Examples

### React Example

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function LeadsDashboard() {
  const [groups, setGroups] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  
  // Step 1: Load grouped counts
  useEffect(() => {
    async function loadGroups() {
      const response = await axios.get('http://localhost:4003/leads', {
        params: {
          groupBy: JSON.stringify(['status'])
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setGroups(response.data.data);
    }
    
    loadGroups();
  }, []);
  
  // Step 2: Drill down into a group
  const viewGroup = async (status) => {
    const response = await axios.get('http://localhost:4003/leads', {
      params: {
        domain: JSON.stringify([['status', '=', status]]),
        limit: 50
      },
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    setLeads(response.data.data);
    setSelectedStatus(status);
  };
  
  return (
    <div>
      <h1>Leads Dashboard</h1>
      
      {/* Show groups */}
      {!selectedStatus && (
        <div className="grid grid-cols-4 gap-4">
          {groups.map(group => (
            <div 
              key={group.status}
              onClick={() => viewGroup(group.status)}
              className="card cursor-pointer"
            >
              <h3>{group.status}</h3>
              <p className="text-4xl">{group.count}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Show leads in group */}
      {selectedStatus && (
        <div>
          <button onClick={() => setSelectedStatus(null)}>
            ← Back to Groups
          </button>
          <h2>{selectedStatus} Leads ({leads.length})</h2>
          <table>
            {leads.map(lead => (
              <tr key={lead._id}>
                <td>{lead.contact_name}</td>
                <td>{lead.email_from}</td>
                <td>{lead.offers?.length || 0} offers</td>
                <td>{lead.todoCount} todos</td>
              </tr>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Success Criteria

Your implementation is working if:

1. ✅ `/leads?domain=[["status","=","New"]]` returns filtered leads
2. ✅ `/leads?groupBy=["status"]` returns grouped counts
3. ✅ Response includes full nested data (offers, openings, etc.)
4. ✅ Works on multiple endpoints (leads, offers, appointments)
5. ✅ Backward compatible (requests without params still work)

---

## 🎯 Next Steps

Once basic testing is complete:

1. **Add Polish Notation** - Support OR/AND/NOT operators
2. **Field Metadata API** - `GET /api/search/fields/Lead`
3. **Frontend Components** - Universal FilterBuilder component
4. **Performance Optimization** - Caching, indexes
5. **Documentation** - API docs for your team

---

## 📞 Support

If you encounter issues:

1. Check search-service logs: `docker logs search-service`
2. Check lead-offers-service logs
3. Verify MongoDB connection
4. Test with Postman first (simpler than frontend)

---

## 🎉 Congratulations!

You now have universal filtering and grouping on ALL your endpoints!

**No more writing custom filter code for each model!** 🚀

