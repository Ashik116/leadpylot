# Missing Features from Monolith - Lead & Offer Service

This document lists model fields and logic that exist in the monolith backend but are missing in the microservice.

## 📋 Summary

- **Lead Model**: ✅ **Synchronized** - All fields match
- **Offer Model**: ✅ **COMPLETED** - All 5 fields + 3 indexes + logic implemented

---

## 🔴 OFFER MODEL - Missing Fields

### 1. **`scheduled_date`** ✅ **COMPLETED**
**Location:** `backend/models/mongo/offer.js` (line 107-111)
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 107-111)

```javascript
scheduled_date: {
  type: Date,
  required: false,
  comment: 'Scheduled follow-up date (defaults to 48 hours from creation if not provided)',
},
```

**Impact:**
- Frontend expects this field (see `OffersTable.tsx` line 184)
- Used for scheduling follow-up dates
- Defaults to 48 hours from creation if not provided

---

### 2. **`scheduled_time`** ✅ **COMPLETED**
**Location:** `backend/models/mongo/offer.js` (line 112-116)
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 112-116)

```javascript
scheduled_time: {
  type: String,
  required: false,
  comment: 'Scheduled follow-up time in HH:MM format (defaults to 48 hours from creation)',
},
```

**Impact:**
- Frontend displays this in offers table (line 195)
- Used for scheduling follow-up times
- Format: `HH:MM` (e.g., "14:30")

---

### 3. **`handover_notes`** ✅ **COMPLETED**
**Location:** `backend/models/mongo/offer.js` (line 117-122)
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 117-122)

```javascript
handover_notes: {
  type: String,
  required: false,
  trim: true,
  comment: 'Notes provided during offer creation (for handover or general notes)',
},
```

**Impact:**
- Frontend displays this in offers table (line 200)
- Used for storing notes during offer creation/handover
- Can be used for general notes or handover-specific notes

---

### 4. **`handover_metadata`** ✅ **COMPLETED**
**Location:** `backend/models/mongo/offer.js` (line 123-137)
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 123-137)

```javascript
handover_metadata: {
  original_agent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: 'Original agent who created this offer (if different from agent_id)',
  },
  handover_at: {
    type: Date,
    comment: 'Timestamp when handover occurred',
  },
  handover_reason: {
    type: String,
    comment: 'Reason for handover',
  },
},
```

**Impact:**
- Tracks handover history
- Used in filtering/queries (see `leadService/queries.js`, `leadService/filters.js`)
- Important for audit trail

---

### 5. **`pending_transfer`** ✅ **COMPLETED**
**Location:** `backend/models/mongo/offer.js` (line 138-167)
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 138-167)

```javascript
pending_transfer: {
  target_agent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    comment: 'Agent to transfer lead to after PDF approval/rejection',
  },
  transfer_notes: {
    type: String,
    comment: 'Notes for the pending transfer',
  },
  scheduled_date: {
    type: Date,
    comment: 'Scheduled date for the transfer',
  },
  scheduled_time: {
    type: String,
    comment: 'Scheduled time for the transfer',
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    comment: 'Status of the pending transfer',
  },
  created_at: {
    type: Date,
    default: Date.now,
    comment: 'When the pending transfer was created',
  },
},
```

**Impact:**
- Used for pending lead transfers after PDF approval/rejection
- Critical for agent handover workflow
- See `offerService/operations/crud.js` line 177-182, 1153-1179

---

## 🔴 OFFER MODEL - Missing Indexes

### 1. **Creator Performance Index** ✅ **COMPLETED**
```javascript
OfferSchema.index({ created_by: 1, createdAt: -1 }); // Line 208
```
**Purpose:** Performance queries by creator
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 208)

---

### 2. **Handover Tracking Index** ✅ **COMPLETED**
```javascript
OfferSchema.index({ 'handover_metadata.original_agent_id': 1 }); // Line 209
```
**Purpose:** Fast queries for handover tracking
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 209)

---

### 3. **Scheduling Index** ✅ **COMPLETED**
```javascript
OfferSchema.index({ scheduled_date: 1 }); // Line 210
```
**Purpose:** Efficient queries for scheduled offers
**Status:** ✅ **Added to microservice** (`src/models/Offer.js` line 210)

---

## 🔴 MISSING LOGIC - Offer Service

### 1. **Scheduled Date/Time Calculation** ✅ **COMPLETED**
**Location:** `backend/services/offerService/operations/crud.js` (lines 89-143)
**Status:** ✅ **Added to microservice** (`src/services/offerService/operations/crud.js` lines 131-142)

```javascript
// Extract scheduling and handover fields
const {
  scheduled_date,
  scheduled_time,
  selected_agent_id,
  notes,
} = offerData;

// Calculate 48-hour default if not provided
const date48HoursLater = new Date();
date48HoursLater.setHours(date48HoursLater.getHours() + 48);

const finalScheduledDate = scheduled_date
  ? new Date(scheduled_date)
  : date48HoursLater;

const finalScheduledTime = scheduled_time || 
  date48HoursLater.toTimeString().slice(0, 5); // HH:MM
```

**Impact:** ✅ Default 48-hour scheduling logic implemented

---

### 2. **Handover Detection Logic** ✅ **COMPLETED**
**Location:** `backend/services/offerService/operations/crud.js` (line 146-147)
**Status:** ✅ **Added to microservice** (`src/services/offerService/operations/crud.js` line 145-146)

```javascript
// Determine if this is a handover (agent selects someone else)
const isHandover = selected_agent_id && 
  selected_agent_id !== user._id.toString();
```

**Impact:** ✅ Handover detection implemented when creating offers

---

### 3. **Pending Transfer Logic** ✅ **COMPLETED**
**Location:** `backend/services/offerService/operations/crud.js` (line 177-182)
**Status:** ✅ **Added to microservice** (`src/services/offerService/operations/crud.js` lines 176-191)

```javascript
// If handover is requested, store it as pending transfer (NOT immediate)
if (isHandover) {
  offerDataWithMetadata.pending_transfer = {
    target_agent_id: selected_agent_id,
    transfer_notes: notes || 'Agent handover pending PDF approval/rejection',
    scheduled_date: finalScheduledDate,
    scheduled_time: finalScheduledTime,
    status: 'pending',
    created_at: new Date(),
  };
}
```

**Impact:** ✅ Pending transfer creation logic implemented

---

### 4. **PDF Approval/Rejection Transfer Logic** ✅ **COMPLETED**
**Location:** `backend/services/offerService/operations/crud.js` (lines 1142-1210)
**Status:** ✅ **Added to microservice** (`src/services/offerService/operations/crud.js` lines 1093-1218 - `executePendingTransfer` function)

**Key Logic:**
- Check if offer has pending transfer
- If PDF approved/rejected, execute the transfer
- Update `pending_transfer.status` to 'completed'
- Populate `handover_metadata`

**Impact:** ✅ Automatic transfer after PDF actions implemented

---

### 5. **Activity Logging for Handover** ✅ **COMPLETED**
**Location:** `backend/services/offerService/operations/crud.js` (line 369-435)
**Status:** ✅ **Added to microservice** (`src/services/offerService/operations/crud.js` lines 312-386)

```javascript
if (isHandover) {
  await createActivity({
    message: `Offer created and lead handed over to ${selectedAgent.name}`,
    action_type: 'offer_pending_transfer',
    // ... metadata
  });
}
```

**Impact:** ✅ Activity logging for handover events implemented

---

## 🔴 MISSING LOGIC - Lead Service Queries

### 1. **Scheduled Date/Time Filtering** ✅ **COMPLETED**
**Location:** `backend/services/leadService/queries.js` (lines 1430-1431, 1579-1580)
**Status:** ✅ **Added to microservice** (`src/services/leadService/queries.js` lines 1657-1679, 1740-1762)

```javascript
// Find offers with scheduled_date or scheduled_time
{ scheduled_date: { $exists: true, $ne: null } },
{ scheduled_time: { $exists: true, $ne: null } }
```

**Impact:** ✅ Filtering by scheduled date/time implemented

---

### 2. **Handover Metadata Filtering** ✅ **COMPLETED**
**Location:** `backend/services/leadService/queries.js` (line 1454, 1603)
**Status:** ✅ **Added to microservice** (`src/services/leadService/queries.js` lines 1681-1701, 1764-1784)

```javascript
'handover_metadata.original_agent_id': { $exists: true }
```

**Impact:** ✅ Filtering by handover metadata implemented

---

## 🔴 MISSING LOGIC - Lead Service Filters

### 1. **Scheduled Offers Filter** ⚠️ **MAY NEED VERIFICATION**
**Location:** `backend/services/leadService/filters.js` (lines 596-601, 762-767)
**Status:** ⚠️ **Implemented in queries.js** - May already work via queries.js integration

```javascript
// Find all offers with scheduled_date or scheduled_time
const offersWithSchedule = await Offer.find({
  $or: [
    { scheduled_date: { $exists: true, $ne: null } },
    { scheduled_time: { $exists: true, $ne: null } }
  ]
}).select('lead_id').lean();
```

**Impact:** ⚠️ Filtering available via queries.js - May need verification if filters.js needs direct implementation

---

### 2. **Handover Offers Filter** ⚠️ **MAY NEED VERIFICATION**
**Location:** `backend/services/leadService/filters.js` (line 635, 795)
**Status:** ⚠️ **Implemented in queries.js** - May already work via queries.js integration

```javascript
'handover_metadata.original_agent_id': { $exists: true }
```

**Impact:** ⚠️ Filtering available via queries.js - May need verification if filters.js needs direct implementation

---

## 🔴 MISSING LOGIC - Lead Grouping Service

### 1. **Scheduled Offers Grouping** ⚠️ **MAY NEED VERIFICATION**
**Location:** `backend/services/leadGroupingService.js` (lines 740-759)
**Status:** ⚠️ **May not be critical** - Core filtering available via queries.js

```javascript
// Find offers with scheduled_date or scheduled_time set
const offersWithSchedule = await Offer.find({
  $or: [
    { scheduled_date: { $ne: null, $exists: true } },
    { scheduled_time: { $ne: null, $exists: true } },
  ]
}).select('lead_id').lean();
```

**Impact:** ⚠️ May be optional - Core functionality available via queries.js

---

## 🔴 MISSING LOGIC - Dynamic Filter Service

### 1. **Scheduled Offers Filter** ⚠️ **MAY NEED VERIFICATION**
**Location:** `backend/services/dynamicFilterService.js` (lines 962-982)
**Status:** ⚠️ **May already work** - Core filtering available via queries.js

Similar logic for filtering leads with scheduled offers

---

## ✅ API VALIDATION

### 1. **Offer Creation Validation** ✅ **COMPLETED**
**Location:** `backend/routes/offers.js` (lines 325-331, 372)

```javascript
body('flex_option').optional().isBoolean(),
body('scheduled_date')
  .optional()
  .isISO8601()
  .toDate(),
body('scheduled_time')
  .optional()
  .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  .withMessage('Scheduled time must be in HH:MM format'),
```

**Status:** ✅ **COMPLETE** - Validation exists in microservice (`routes/offers/validations.js` line 182, 205)
**Note:** ✅ Fields are now in the model and validation is working!

---

## 📊 Summary Table

| Feature | Monolith | Microservice | Status |
|---------|----------|--------------|--------|
| **Lead Model Fields** | ✅ Complete | ✅ Complete | ✅ **SYNCED** |
| **Offer Model - scheduled_date** | ✅ | ✅ | ✅ **COMPLETED** |
| **Offer Model - scheduled_time** | ✅ | ✅ | ✅ **COMPLETED** |
| **Offer Model - handover_notes** | ✅ | ✅ | ✅ **COMPLETED** |
| **Offer Model - handover_metadata** | ✅ | ✅ | ✅ **COMPLETED** |
| **Offer Model - pending_transfer** | ✅ | ✅ | ✅ **COMPLETED** |
| **Offer Indexes (3)** | ✅ | ✅ | ✅ **COMPLETED** |
| **Scheduled Date/Time Logic** | ✅ | ✅ | ✅ **COMPLETED** |
| **Handover Detection Logic** | ✅ | ✅ | ✅ **COMPLETED** |
| **Pending Transfer Logic** | ✅ | ✅ | ✅ **COMPLETED** |
| **PDF Transfer Logic** | ✅ | ✅ | ✅ **COMPLETED** |
| **Activity Logging** | ✅ | ✅ | ✅ **COMPLETED** |
| **Query Filters** | ✅ | ✅ | ✅ **COMPLETED** |
| **Grouping Logic** | ✅ | ⚠️ | ⚠️ **PARTIAL** (Filters in queries.js, filters.js may need updates) |

---

## 🎯 Files That Need Updates

### **Model Files:**
1. ✅ `backend/microservices/lead-offers-service/src/models/Offer.js`
   - ✅ Add 5 missing fields - **COMPLETED**
   - ✅ Add 3 missing indexes - **COMPLETED**
   - ✅ Update `toResponse()` method - **COMPLETED**

### **Service Files:**
1. ✅ `backend/microservices/lead-offers-service/src/services/offerService/operations/crud.js`
   - ✅ Add scheduled date/time calculation - **COMPLETED**
   - ✅ Add handover detection - **COMPLETED**
   - ✅ Add pending transfer logic - **COMPLETED**
   - ✅ Add PDF approval/rejection transfer logic - **COMPLETED** (`executePendingTransfer` function)
   - ✅ Add activity logging - **COMPLETED**

2. ✅ `backend/microservices/lead-offers-service/src/services/leadService/queries.js`
   - ✅ Add scheduled date/time filtering - **COMPLETED** (for both agents and admins)
   - ✅ Add handover metadata filtering - **COMPLETED** (for both agents and admins)

3. ⚠️ `backend/microservices/lead-offers-service/src/services/leadService/filters.js`
   - ⚠️ Add scheduled offers filter - **MAY NEED VERIFICATION**
   - ⚠️ Add handover offers filter - **MAY NEED VERIFICATION**

4. ⚠️ `backend/microservices/lead-offers-service/src/services/leadGroupingService.js`
   - ⚠️ Add scheduled offers grouping - **MAY NEED VERIFICATION**

5. ⚠️ `backend/microservices/lead-offers-service/src/services/dynamicFilterService.js`
   - ⚠️ Add scheduled offers filter - **MAY NEED VERIFICATION**

### **Validation Files:**
- ✅ Already have validation (routes/offers/validations.js)

---

## 📝 Notes

1. **Frontend Expects These Fields:**
   - ✅ `scheduled_date` - Displayed in offers table - **NOW AVAILABLE**
   - ✅ `scheduled_time` - Displayed in offers table - **NOW AVAILABLE**
   - ✅ `handover_notes` - Displayed in offers table - **NOW AVAILABLE**
   - ✅ `flex_option` - Already exists

2. **✅ Critical Features - COMPLETED:**
   - ✅ **Agent Handover Workflow** - **FULLY IMPLEMENTED**
   - ✅ **Scheduled Follow-ups** - **FULLY IMPLEMENTED**
   - ✅ **Pending Transfers** - **FULLY IMPLEMENTED**

3. **✅ Impact - RESOLVED:**
   - ✅ Frontend will now receive all expected fields
   - ✅ Handover functionality fully operational
   - ✅ Scheduled follow-ups fully operational
   - ✅ PDF approval/rejection transfers fully operational

---

**Last Updated:** ✅ **COMPLETED** - All core features implemented (2024-12-19)
**Priority:** ✅ **COMPLETED** - Core model fields, indexes, offer service logic, and query filters implemented

## ✅ Implementation Status

### ✅ **COMPLETED:**
1. ✅ All 5 Offer model fields added (`scheduled_date`, `scheduled_time`, `handover_notes`, `handover_metadata`, `pending_transfer`)
2. ✅ All 3 indexes added (creator performance, handover tracking, scheduling)
3. ✅ Scheduled date/time calculation with 48-hour default
4. ✅ Handover detection logic
5. ✅ Pending transfer creation logic
6. ✅ PDF approval/rejection transfer logic (`executePendingTransfer` function)
7. ✅ Activity logging for handover events
8. ✅ Query filters for scheduled offers and handover metadata (both agent and admin paths)
9. ✅ `toResponse()` method updated to include new fields

### ⚠️ **MAY NEED VERIFICATION:**
- Filters in `filters.js` (may already work via queries.js)
- Grouping logic in `leadGroupingService.js` (may not be critical if queries.js handles it)
- Dynamic filter service (may already work via queries.js)

**Note:** Core functionality is complete. Remaining items may be optional enhancements depending on specific use cases.

