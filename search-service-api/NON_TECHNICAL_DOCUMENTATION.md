# Search Service - Non-Technical Documentation

## 📖 Table of Contents
1. [What is the Search Service?](#what-is-the-search-service)
2. [Why Do We Need It?](#why-do-we-need-it)
3. [How Does It Work?](#how-does-it-work)
4. [Business Benefits](#business-benefits)
5. [How Teams Use It](#how-teams-use-it)
6. [Where It Fits in the CRM](#where-it-fits-in-the-crm)
7. [Security & Privacy](#security--privacy)
8. [Frequently Asked Questions](#frequently-asked-questions)

---

## What is the Search Service?

The **Search Service** is the CRM's smart filtering and grouping engine.

It helps users quickly answer questions like:
- "Show me only new leads"
- "Group offers by agent"
- "How many emails are pending by project?"

Instead of each service building its own custom filters, the Search Service provides one shared way to query data.

---

## Why Do We Need It?

### Problems It Solves

**1. Inconsistent Filters Across Modules**
- ❌ Different pages/services behave differently
- ✅ One shared search standard across the platform

**2. Slow Decision-Making**
- ❌ Teams spend time exporting and manually sorting data
- ✅ Fast filtering and grouping directly in the app

**3. Hard-to-maintain Frontend Filters**
- ❌ UI teams hardcode field names for every screen
- ✅ Search metadata APIs provide fields/options dynamically

**4. Scaling Challenges**
- ❌ Every service duplicates query logic
- ✅ Dedicated search service scales independently

---

## How Does It Work?

### Simple Explanation

```
┌──────────────────────────────────────────────────────────────┐
│                     USER ASKS A QUESTION                      │
│         (Filter, search, group data in CRM screens)           │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                     SEARCH SERVICE DECIDES                    │
│   • Which model to search?                                    │
│   • Which filters to apply?                                   │
│   • Should results be grouped?                                │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    RETURNS READY RESULTS                       │
│   • Filtered list                                               │
│   • Grouped counts                                               │
│   • Metadata for frontend filter builders                        │
└──────────────────────────────────────────────────────────────┘
```

### What makes it special

- Works across multiple business entities (Lead, Offer, Email, etc.)
- Supports both list filtering and grouped analytics
- Helps frontend build filters without coding every field manually

---

## Business Benefits

### For Leadership
- Faster reporting views
- Better cross-team visibility
- More confidence in decision data

### For Sales & Operations
- Quickly find high-priority records
- Group and triage workloads by agent/project/status
- Reduce time spent in spreadsheets

### For Product & Engineering
- Reusable query logic across services
- Less duplicated backend code
- Faster delivery of new filtered screens

---

## How Teams Use It

### Sales Team Examples
- Filter leads by status, source, or assigned agent
- Group offers by stage to see pipeline health

### Operations Examples
- Find overdue or unassigned work quickly
- Group tasks/emails by project for balancing workloads

### Management Examples
- Track distribution by team or user
- Compare activity patterns over time

---

## Where It Fits in the CRM

The Search Service is a shared infrastructure layer:

- **Email Service** calls it for universal query behavior on email listing
- **Lead Offer Service** can use it for advanced filtering and grouped analytics
- **Frontend apps** use metadata endpoints to generate dynamic filter UIs

In short: it does not replace business services - it powers how data is **found and organized**.

---

## Security & Privacy

### Access control
- Protected by JWT authentication
- Permission checks for search and metadata routes
- Agent-level visibility restrictions can be enforced in query logic

### Data handling
- Reads from trusted shared data sources
- Returns only fields and records permitted by auth + role rules

### Operational safety
- Dedicated health/status endpoints
- Controlled by environment-based configuration

---

## Frequently Asked Questions

**Q: Is this only for developers?**  
A: No. End users benefit directly because filter screens become faster and more consistent.

**Q: Does Search Service store separate business data?**  
A: It mainly queries existing CRM data and schema metadata; it is not a separate source-of-truth for leads/offers.

**Q: Can we add new filters without rebuilding everything?**  
A: Usually yes. Metadata-driven filter options reduce frontend rework.

**Q: Is Search Service mandatory for all pages?**  
A: Not mandatory, but strongly recommended for consistent filtering/grouping behavior.

**Q: What happens if Search Service is unavailable?**  
A: Dependent pages may lose advanced query features; fallback behavior depends on the calling service implementation.

---

**For Technical Documentation:** See `TECHNICAL_DOCUMENTATION.md`  
**Last Updated:** March 2026  
**Version:** 1.0.0

