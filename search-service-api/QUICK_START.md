# Universal Query Middleware - Quick Start

## 🎉 Implementation Complete!

Your system now supports universal filtering and grouping on ANY endpoint!

---

## ⚡ Quick Test (30 seconds)

### 1. Ensure Services Are Running

```bash
# Check if search-service is running
curl http://localhost:3010/health

# Check if lead-offers-service is running
curl http://localhost:4003/health
```

If not running, start them from docker-compose or manually.

---

### 2. Get Your Auth Token

```bash
# Login (adjust credentials)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"sakib","password":"your_password"}'

# Copy the token from response
```

---

### 3. Test Basic Filtering

```bash
# Set your token
TOKEN="your_token_here"

# Original endpoint (still works)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4003/leads?page=1&limit=10"

# With filtering (NEW!)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["status","=","New"]]&limit=10'
```

**Result:** You should see only leads with status="New"

---

### 4. Test Grouping

```bash
# Group by status (get counts)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status"]'
```

**Result:**
```json
{
  "grouped": true,
  "data": [
    { "status": "New", "count": 70, "recordIds": [...] },
    { "status": "Qualified", "count": 60, "recordIds": [...] }
  ]
}
```

---

### 5. Test Drill-Down

```bash
# Step 1: See there are 70 "New" leads
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status"]'

# Step 2: Get those 70 leads
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["status","=","New"]]&limit=70'
```

**Result:** Full lead data with nested offers, openings, appointments, etc.

---

## 📋 What You Can Do Now

### On ANY Endpoint

```bash
# Leads
GET /leads?domain=[...]
GET /leads?groupBy=[...]

# Offers
GET /offers?domain=[...]
GET /offers?groupBy=[...]

# Appointments
GET /appointments?domain=[...]
GET /appointments?groupBy=[...]

# Openings
GET /openings?domain=[...]
GET /openings?groupBy=[...]

# Todos
GET /todos?domain=[...]
GET /todos?groupBy=[...]

# ALL work automatically!
```

---

## 🎨 Common Patterns

### Pattern 1: Dashboard Cards

```bash
# Get counts for dashboard
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status"]'

# Result: New(70), Qualified(60), Proposal(30), Closed(10)
```

### Pattern 2: Filter by Date

```bash
# Leads created this month
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["createdAt",">=","2024-12-01"]]'
```

### Pattern 3: Filter by User

```bash
# My leads
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["user_id","=","your_user_id"]]'
```

### Pattern 4: Complex OR Logic

```bash
# Status is New OR Qualified
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["|",["status","=","New"],["status","=","Qualified"]]]'
```

### Pattern 5: Multi-Level Group

```bash
# Group by status and user
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status","user_id"]'
```

---

## 🎯 Your Exact Use Case

```bash
# 1. Group leads by status (see counts)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?groupBy=["status"]'

# Response:
# { "status": "New", "count": 70, "recordIds": [...] }
# { "status": "Qualified", "count": 60, "recordIds": [...] }

# 2. Click "New" → Get those 70 leads with full data
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:4003/leads?domain=[["status","=","New"]]&limit=70'

# Response: 70 leads with offers, openings, appointments, todoCount
```

✅ **Done!** This is exactly what you asked for.

---

## 📱 Frontend Example

```javascript
// LeadsPage.tsx
const [groups, setGroups] = useState([]);
const [leads, setLeads] = useState([]);

// Load groups
useEffect(() => {
  axios.get('/api/lead-offers/leads?groupBy=["status"]')
    .then(res => setGroups(res.data.data));
}, []);

// Drill down
const viewGroup = (status) => {
  axios.get(`/api/lead-offers/leads?domain=[["status","=","${status}"]]`)
    .then(res => setLeads(res.data.data));
};

return (
  <>
    {/* Show counts */}
    {groups.map(g => (
      <Card onClick={() => viewGroup(g.status)}>
        {g.status}: {g.count} leads
      </Card>
    ))}
    
    {/* Show leads */}
    <LeadsTable data={leads} />
  </>
);
```

---

## ✅ Success Checklist

- [ ] Services are running
- [ ] Can filter: `/leads?domain=[["status","=","New"]]`
- [ ] Can group: `/leads?groupBy=["status"]`
- [ ] Response includes nested data (offers, openings)
- [ ] Works on multiple endpoints

---

## 🚀 Next: Build Your Dashboard

Now that filtering/grouping works, you can build:

1. **Dashboard Cards** - Show counts for each status
2. **Drill-Down Views** - Click card → see leads
3. **Advanced Filters** - Date ranges, user filters, etc.
4. **Analytics** - Multi-level grouping for insights

---

## 📞 Need Help?

1. Check `TESTING_GUIDE.md` for detailed examples
2. See `DRILL_DOWN_SOLUTION.md` for full API reference
3. Review `ARCHITECTURE_COMPARISON.md` for design decisions

---

**You're all set! Start testing and building your dashboard!** 🎉

